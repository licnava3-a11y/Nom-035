import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb } from "@/components/Breadcrumb";
import {
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight,
  FileSpreadsheet,
  Building2,
  RefreshCw,
  Eye,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ─── Sistemas HR disponibles ──────────────────────────────────────────────────

const HR_SYSTEMS = [
  {
    id: "contpaqiNominas",
    label: "CONTPAQi Nóminas",
    vendor: "Grupo Caminante",
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-800",
    description:
      "Compatible con CONTPAQi Nóminas 18 y versiones anteriores. Exporta desde Catálogos → Empleados → Exportar.",
    fields: [
      "Clave",
      "Nombre",
      "RFC",
      "CURP",
      "NSS",
      "Departamento",
      "Puesto",
      "Fecha de Alta",
      "Sexo",
      "Correo Electrónico",
    ],
  },
  {
    id: "aspelNoi",
    label: "Aspel NOI",
    vendor: "Aspel",
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-800",
    description:
      "Compatible con Aspel NOI 10 y versiones anteriores. Exporta desde Trabajadores → Exportar a Excel.",
    fields: [
      "CLAVE",
      "NOMBRE",
      "RFC",
      "CURP",
      "NSS",
      "DEPARTAMENTO",
      "PUESTO",
      "FECHA INGRESO",
      "SEXO",
      "EMAIL",
    ],
  },
  {
    id: "sapHcm",
    label: "SAP HCM / SuccessFactors",
    vendor: "SAP",
    color: "bg-orange-50 border-orange-200",
    badgeColor: "bg-orange-100 text-orange-800",
    description:
      "Compatible con SAP HCM y SAP SuccessFactors. Exporta el informe de empleados activos en formato CSV.",
    fields: [
      "Personnel Number",
      "Last Name",
      "First Name",
      "RFC",
      "CURP",
      "NSS",
      "Department",
      "Position",
      "Hire Date",
      "Gender",
      "Email",
    ],
  },
  {
    id: "oracleHcm",
    label: "Oracle HCM Cloud",
    vendor: "Oracle",
    color: "bg-red-50 border-red-200",
    badgeColor: "bg-red-100 text-red-800",
    description:
      "Compatible con Oracle HCM Cloud. Exporta el reporte de personas activas en formato CSV.",
    fields: [
      "Person Number",
      "Last Name",
      "First Name",
      "RFC",
      "CURP",
      "National Identifier",
      "Department Name",
      "Job Name",
      "Hire Date",
      "Gender",
      "Work Email",
    ],
  },
  {
    id: "nomipaq",
    label: "Nomipaq",
    vendor: "Computación en Acción",
    color: "bg-purple-50 border-purple-200",
    badgeColor: "bg-purple-100 text-purple-800",
    description:
      "Compatible con Nomipaq. Exporta desde Catálogo de Empleados → Exportar a Excel.",
    fields: [
      "Clave Empleado",
      "Nombre Completo",
      "RFC",
      "CURP",
      "NSS",
      "Área",
      "Puesto",
      "Fecha Ingreso",
      "Sexo",
      "Email",
    ],
  },
  {
    id: "suaImss",
    label: "SUA / IMSS (TXT/CSV)",
    vendor: "IMSS",
    color: "bg-teal-50 border-teal-200",
    badgeColor: "bg-teal-100 text-teal-800",
    description:
      "Compatible con el Sistema Único de Autodeterminación (SUA) del IMSS. Importa movimientos de altas, bajas y modificaciones de salario desde archivos TXT o CSV.",
    fields: [
      "NSS",
      "RFC",
      "CURP",
      "Nombre",
      "Apellido Paterno",
      "Apellido Materno",
      "Salario Diario",
      "Fecha Alta",
      "Fecha Baja",
      "Tipo Movimiento",
    ],
  },
  {
    id: "generic",
    label: "Formato Genérico NOM-035",
    vendor: "Personalizado",
    color: "bg-gray-50 border-gray-200",
    badgeColor: "bg-gray-100 text-gray-800",
    description:
      "Formato flexible con columnas en español. Útil para cualquier sistema que no esté en la lista.",
    fields: [
      "nombre",
      "email",
      "rfc",
      "curp",
      "nss",
      "departamento",
      "puesto",
      "fechaIngreso",
      "sexo",
      "telefono",
    ],
  },
] as const;

type HrSystemId = (typeof HR_SYSTEMS)[number]["id"];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HRIntegration() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSystem, setSelectedSystem] = useState<HrSystemId | null>(null);
  const [step, setStep] = useState<"select" | "upload" | "preview" | "result">(
    "select"
  );
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [fileData, setFileData] = useState<{
    base64: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const previewMutation = trpc.hrIntegration.previewImport.useMutation();
  const confirmMutation = trpc.hrIntegration.confirmImport.useMutation();
  const exportContpaqiMutation =
    trpc.hrIntegration.exportForContpaqi.useMutation();
  const exportNOIMutation = trpc.hrIntegration.exportForAspelNoi.useMutation();

  // ── Manejar selección de archivo ──────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSystem) return;

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx|xls|csv)$/i)
    ) {
      toast({
        title: "Formato no válido",
        description: "Solo se aceptan archivos .xlsx, .xls o .csv",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no debe superar 10 MB.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = btoa(
        Array.from(bytes, b => String.fromCharCode(b)).join("")
      );
      setFileData({ base64, name: file.name });

      const result = await previewMutation.mutateAsync({
        fileData: base64,
        fileName: file.name,
        systemId: selectedSystem,
      });
      setPreviewData(result);
      setStep("preview");
    } catch (err: any) {
      toast({
        title: "Error al procesar el archivo",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Confirmar importación ─────────────────────────────────────────────────
  const handleConfirmImport = async () => {
    if (!fileData || !selectedSystem) return;
    setIsLoading(true);
    try {
      const result = await confirmMutation.mutateAsync({
        fileData: fileData.base64,
        fileName: fileData.name,
        systemId: selectedSystem,
        skipDuplicateEmails: true,
      });
      setImportResult(result);
      setStep("result");
      toast({
        title: "Importación completada",
        description: `${result.imported} empleados importados, ${result.skipped} omitidos, ${result.failed} con error.`,
      });
    } catch (err: any) {
      toast({
        title: "Error en la importación",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Exportar para CONTPAQi ────────────────────────────────────────────────
  const handleExportContpaqi = async () => {
    try {
      const result = await exportContpaqiMutation.mutateAsync();
      const binary = atob(result.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Exportación exitosa",
        description: `${result.count} empleados exportados en formato CONTPAQi.`,
      });
    } catch (err: any) {
      toast({
        title: "Error al exportar",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // ── Exportar para Aspel NOI ───────────────────────────────────────────────
  const handleExportNOI = async () => {
    try {
      const result = await exportNOIMutation.mutateAsync();
      const binary = atob(result.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Exportación exitosa",
        description: `${result.count} empleados exportados en formato Aspel NOI.`,
      });
    } catch (err: any) {
      toast({
        title: "Error al exportar",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const resetFlow = () => {
    setStep("select");
    setSelectedSystem(null);
    setPreviewData(null);
    setImportResult(null);
    setFileData(null);
  };

  const selectedSystemInfo = HR_SYSTEMS.find(s => s.id === selectedSystem);

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Administración", href: "/" },
            { label: "Integración con Sistemas de RH" },
          ]}
        />
        <h1 className="text-3xl font-bold mt-4">
          Integración con Sistemas de RH
        </h1>
        <p className="text-muted-foreground mt-1">
          Importa empleados desde CONTPAQi, Aspel NOI, SAP HCM, Oracle HCM y
          otros sistemas de nómina
        </p>
      </div>

      {/* ── Exportar empleados ── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <CardTitle>Exportar Empleados</CardTitle>
          </div>
          <CardDescription>
            Descarga el catálogo de empleados activos en el formato de tu
            sistema de nómina
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleExportContpaqi}
              disabled={exportContpaqiMutation.isPending}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {exportContpaqiMutation.isPending
                ? "Exportando..."
                : "Exportar para CONTPAQi Nóminas"}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportNOI}
              disabled={exportNOIMutation.isPending}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {exportNOIMutation.isPending
                ? "Exportando..."
                : "Exportar para Aspel NOI"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Los archivos exportados incluyen: Clave, Nombre, RFC, CURP, NSS,
            Departamento, Puesto, Fecha de Alta, Sexo y Correo.
          </p>
        </CardContent>
      </Card>

      {/* ── Flujo de importación ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle>Importar Empleados</CardTitle>
          </div>
          <CardDescription>
            Carga el archivo exportado desde tu sistema de nómina para
            sincronizar el catálogo de empleados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Indicador de pasos */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            {[
              { key: "select", label: "1. Seleccionar sistema" },
              { key: "upload", label: "2. Subir archivo" },
              { key: "preview", label: "3. Vista previa" },
              { key: "result", label: "4. Resultado" },
            ].map((s, i, arr) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    step === s.key
                      ? "bg-primary text-primary-foreground"
                      : ["select", "upload", "preview", "result"].indexOf(
                            step
                          ) > i
                        ? "bg-green-100 text-green-800"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* PASO 1: Seleccionar sistema */}
          {step === "select" && (
            <div>
              <p className="text-sm font-medium mb-4">
                Selecciona el sistema de nómina desde el que exportaste el
                archivo:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {HR_SYSTEMS.map(sys => (
                  <button
                    key={sys.id}
                    onClick={() => {
                      setSelectedSystem(sys.id);
                      setStep("upload");
                    }}
                    className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${sys.color} hover:border-primary`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-sm">{sys.label}</span>
                      <Badge className={`text-xs ${sys.badgeColor}`}>
                        {sys.vendor}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {sys.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: Subir archivo */}
          {step === "upload" && selectedSystemInfo && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>
                  Sistema seleccionado: {selectedSystemInfo.label}
                </AlertTitle>
                <AlertDescription>
                  {selectedSystemInfo.description}
                </AlertDescription>
              </Alert>

              <div>
                <p className="text-sm font-medium mb-2">Columnas esperadas:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedSystemInfo.fields.map(f => (
                    <Badge key={f} variant="outline" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>

              <div
                className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Procesando archivo...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                    <p className="font-medium">
                      Haz clic para seleccionar el archivo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Formatos aceptados: .xlsx, .xls, .csv (máx. 10 MB)
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetFlow}>
                  Cambiar sistema
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3: Vista previa */}
          {step === "preview" && previewData && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <Eye className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    Vista previa — {previewData.totalRows} registros detectados
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Se muestran los primeros {previewData.previewRows.length}{" "}
                    registros. Los emails duplicados serán omitidos
                    automáticamente.
                  </p>
                </div>
              </div>

              {previewData.unmappedColumns.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Columnas no reconocidas</AlertTitle>
                  <AlertDescription>
                    Las siguientes columnas no se importarán (no tienen
                    equivalente en el sistema):
                    <span className="font-mono text-xs ml-1">
                      {previewData.unmappedColumns.join(", ")}
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">RFC</TableHead>
                      <TableHead className="text-xs">CURP</TableHead>
                      <TableHead className="text-xs">NSS</TableHead>
                      <TableHead className="text-xs">Departamento</TableHead>
                      <TableHead className="text-xs">Puesto</TableHead>
                      <TableHead className="text-xs">Género</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.previewRows.map((row: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          {`${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() ||
                            row.nombre ||
                            "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.email || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {row.rfc || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {row.curp || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {row.nss || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.departamento || row.department || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.puesto || row.position || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.gender || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleConfirmImport} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Confirmar e Importar {previewData.totalRows} registros
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetFlow}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* PASO 4: Resultado */}
          {step === "result" && importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">
                    {importResult.imported}
                  </p>
                  <p className="text-sm text-green-600">Importados</p>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">
                    {importResult.skipped}
                  </p>
                  <p className="text-sm text-yellow-600">
                    Omitidos (duplicados)
                  </p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                  <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">
                    {importResult.failed}
                  </p>
                  <p className="text-sm text-red-600">Con error</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Detalle de errores:
                  </p>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Fila</TableHead>
                          <TableHead className="text-xs">Error</TableHead>
                          <TableHead className="text-xs">Datos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors
                          .slice(0, 20)
                          .map((err: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs">
                                {err.row}
                              </TableCell>
                              <TableCell className="text-xs text-red-600">
                                {err.error}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {err.data?.email || err.data?.nombre || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={resetFlow}>
                  <Upload className="mr-2 h-4 w-4" />
                  Nueva importación
                </Button>
                <Button variant="outline" asChild>
                  <a href="/employees">Ver catálogo de empleados</a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Guía de compatibilidad ── */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Guía de Compatibilidad</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Cómo exportar</TableHead>
                  <TableHead>Campos mapeados</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    CONTPAQi Nóminas 18
                  </TableCell>
                  <TableCell className="text-sm">
                    Catálogos → Empleados → Exportar a Excel
                  </TableCell>
                  <TableCell className="text-sm">10 campos</TableCell>
                  <TableCell className="text-sm">
                    El nombre viene en formato "AP.PAT AP.MAT NOMBRE(S)"
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Aspel NOI 10</TableCell>
                  <TableCell className="text-sm">
                    Trabajadores → Exportar → Excel
                  </TableCell>
                  <TableCell className="text-sm">10 campos</TableCell>
                  <TableCell className="text-sm">
                    Columnas en MAYÚSCULAS
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">SAP HCM</TableCell>
                  <TableCell className="text-sm">
                    Informe PA20 → Exportar CSV
                  </TableCell>
                  <TableCell className="text-sm">11 campos</TableCell>
                  <TableCell className="text-sm">
                    Columnas en inglés. RFC/CURP deben estar configurados como
                    infotipos
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Oracle HCM Cloud
                  </TableCell>
                  <TableCell className="text-sm">
                    Reportes → Personas Activas → CSV
                  </TableCell>
                  <TableCell className="text-sm">11 campos</TableCell>
                  <TableCell className="text-sm">
                    NSS se mapea desde "National Identifier"
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Nomipaq</TableCell>
                  <TableCell className="text-sm">
                    Catálogo → Empleados → Exportar
                  </TableCell>
                  <TableCell className="text-sm">10 campos</TableCell>
                  <TableCell className="text-sm">
                    Compatible con versiones recientes
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
