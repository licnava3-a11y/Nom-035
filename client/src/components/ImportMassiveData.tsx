import { useState, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export type ImportColumn = {
  key: string;
  label: string;
  required: boolean;
  type: "text" | "number" | "date" | "email";
  validator?: (value: any) => string | null; // Returns error message or null if valid
};

export type ImportError = {
  row: number;
  column: string;
  message: string;
  type: "error" | "warning";
};

export type ImportResult = {
  data: any[];
  errors: ImportError[];
  warnings: ImportError[];
};

type ImportMassiveDataProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  columns: ImportColumn[];
  templateFileName: string;
  onImport: (data: any[]) => Promise<void>;
  onDownloadTemplate: () => void;
};

export function ImportMassiveData({
  open,
  onOpenChange,
  title,
  description,
  columns,
  templateFileName,
  onImport,
  onDownloadTemplate,
}: ImportMassiveDataProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [warnings, setWarnings] = useState<ImportError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const validateData = useCallback(
    (data: any[]): ImportResult => {
      const errors: ImportError[] = [];
      const warnings: ImportError[] = [];

      data.forEach((row, index) => {
        columns.forEach((column: any) => {
          const value = row[column.key];

          // Check required fields
          if (
            column.required &&
            (value === undefined || value === null || value === "")
          ) {
            errors.push({
              row: index + 2, // +2 because Excel is 1-indexed and has header row
              column: column.label,
              message: `Campo requerido vacío`,
              type: "error",
            });
            return;
          }

          // Type validation
          if (value !== undefined && value !== null && value !== "") {
            switch (column.type) {
              case "number":
                if (isNaN(Number(value))) {
                  errors.push({
                    row: index + 2,
                    column: column.label,
                    message: `Debe ser un número`,
                    type: "error",
                  });
                }
                break;
              case "email":
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(String(value))) {
                  errors.push({
                    row: index + 2,
                    column: column.label,
                    message: `Formato de correo electrónico inválido`,
                    type: "error",
                  });
                }
                break;
              case "date":
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                  errors.push({
                    row: index + 2,
                    column: column.label,
                    message: `Formato de fecha inválido`,
                    type: "error",
                  });
                }
                break;
            }
          }

          // Custom validator
          if (
            column.validator &&
            value !== undefined &&
            value !== null &&
            value !== ""
          ) {
            const validationError = column.validator(value);
            if (validationError) {
              warnings.push({
                row: index + 2,
                column: column.label,
                message: validationError,
                type: "warning",
              });
            }
          }
        });
      });

      return { data, errors, warnings };
    },
    [columns]
  );

  const handleFileChange = useCallback(
    async (selectedFile: File) => {
      if (
        !selectedFile.name.endsWith(".xlsx") &&
        !selectedFile.name.endsWith(".xls")
      ) {
        setErrors([
          {
            row: 0,
            column: "Archivo",
            message: "El archivo debe ser de formato Excel (.xlsx o .xls)",
            type: "error",
          },
        ]);
        return;
      }

      setFile(selectedFile);
      setIsProcessing(true);

      try {
        // Dynamic import to avoid loading xlsx library until needed
        const XLSX = await import("xlsx");

        const reader = new FileReader();
        reader.onload = e => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
              setErrors([
                {
                  row: 0,
                  column: "Archivo",
                  message: "El archivo está vacío",
                  type: "error",
                },
              ]);
              setIsProcessing(false);
              return;
            }

            // Validate structure
            const firstRow = jsonData[0] as any;
            const missingColumns = columns
              .filter((col: any) => col.required)
              .filter((col: any) => !(col.key in firstRow));

            if (missingColumns.length > 0) {
              setErrors([
                {
                  row: 0,
                  column: "Estructura",
                  message: `Columnas requeridas faltantes: ${missingColumns.map((c: any) => c.label).join(", ")}`,
                  type: "error",
                },
              ]);
              setIsProcessing(false);
              return;
            }

            // Validate data
            const result = validateData(jsonData);
            setPreviewData(result.data);
            setErrors(result.errors);
            setWarnings(result.warnings);
            setShowPreview(true);
          } catch (error) {
            setErrors([
              {
                row: 0,
                column: "Archivo",
                message: `Error al procesar el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`,
                type: "error",
              },
            ]);
          } finally {
            setIsProcessing(false);
          }
        };

        reader.readAsBinaryString(selectedFile);
      } catch (error) {
        setErrors([
          {
            row: 0,
            column: "Archivo",
            message: `Error al cargar el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`,
            type: "error",
          },
        ]);
        setIsProcessing(false);
      }
    },
    [columns, validateData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileChange(droppedFile);
      }
    },
    [handleFileChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleConfirmImport = async () => {
    if (errors.length > 0) {
      return;
    }

    setIsProcessing(true);
    try {
      await onImport(previewData);
      // Reset state
      setFile(null);
      setPreviewData([]);
      setErrors([]);
      setWarnings([]);
      setShowPreview(false);
      onOpenChange(false);
    } catch (error) {
      setErrors([
        {
          row: 0,
          column: "Importación",
          message: `Error al importar datos: ${error instanceof Error ? error.message : "Error desconocido"}`,
          type: "error",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    setWarnings([]);
    setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar Plantilla {templateFileName}
            </Button>
          </div>

          {/* Upload Area */}
          {!showPreview && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Arrastra y suelta tu archivo Excel aquí, o
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".xlsx,.xls";
                  input.onchange = e => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileChange(file);
                  };
                  input.click();
                }}
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar Archivo
              </Button>
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Archivo seleccionado: {file.name}
                </p>
              )}
            </div>
          )}

          {/* Errors and Warnings */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errores encontrados ({errors.length})</AlertTitle>
              <AlertDescription>
                <ScrollArea className="h-32 mt-2">
                  <ul className="text-sm space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>
                        {error.row > 0 && `Fila ${error.row}, `}
                        <strong>{error.column}:</strong> {error.message}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Advertencias ({warnings.length})</AlertTitle>
              <AlertDescription>
                <ScrollArea className="h-32 mt-2">
                  <ul className="text-sm space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index}>
                        Fila {warning.row}, <strong>{warning.column}:</strong>{" "}
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Data */}
          {showPreview && previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Vista Previa ({previewData.length} registros)
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPreview(false);
                    setFile(null);
                    setPreviewData([]);
                    setErrors([]);
                    setWarnings([]);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>

              {errors.length === 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Validación exitosa</AlertTitle>
                  <AlertDescription>
                    Todos los datos son válidos. Puedes proceder con la
                    importación.
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-96 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      {columns.map((column: any) => (
                        <TableHead key={column.key}>
                          {column.label}
                          {column.required && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Requerido
                            </Badge>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 50).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        {columns.map((column: any) => (
                          <TableCell key={column.key}>
                            {row[column.key]?.toString() || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {previewData.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  Mostrando los primeros 50 registros de {previewData.length}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          {showPreview && (
            <Button
              onClick={handleConfirmImport}
              disabled={isProcessing || errors.length > 0}
            >
              {isProcessing
                ? "Importando..."
                : `Confirmar Importación (${previewData.length} registros)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
