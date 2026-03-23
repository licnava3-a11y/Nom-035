import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function MassiveImport() {
  const [activeTab, setActiveTab] = useState("departments");
  const [departmentsFile, setDepartmentsFile] = useState<File | null>(null);
  const [positionsFile, setPositionsFile] = useState<File | null>(null);
  const [employeesFile, setEmployeesFile] = useState<File | null>(null);

  const importDepartmentsMutation = trpc.massiveImport.importDepartments.useMutation();
  const importPositionsMutation = trpc.massiveImport.importPositions.useMutation();
  const importEmployeesMutation = trpc.massiveImport.importEmployees.useMutation();

  const { data: departments } = trpc.massiveImport.getDepartmentsForImport.useQuery();
  const { data: positions } = trpc.massiveImport.getPositionsForImport.useQuery();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "departments") setDepartmentsFile(file);
    else if (type === "positions") setPositionsFile(file);
    else if (type === "employees") setEmployeesFile(file);
  };

  const processExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsBinaryString(file);
    });
  };

  const handleImportDepartments = async () => {
    if (!departmentsFile) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    try {
      const data = await processExcelFile(departmentsFile);
      const result = await importDepartmentsMutation.mutateAsync(data as any);
      toast.success(result.message);
      setDepartmentsFile(null);
    } catch (error: any) {
      toast.error(error.message || "Error al importar departamentos");
    }
  };

  const handleImportPositions = async () => {
    if (!positionsFile) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    try {
      const data = await processExcelFile(positionsFile);
      const result = await importPositionsMutation.mutateAsync(data as any);
      toast.success(result.message);
      setPositionsFile(null);
    } catch (error: any) {
      toast.error(error.message || "Error al importar puestos");
    }
  };

  const handleImportEmployees = async () => {
    if (!employeesFile) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    try {
      const data = await processExcelFile(employeesFile);
      const result = await importEmployeesMutation.mutateAsync(data as any);
      
      if (result.duplicates > 0) {
        toast.warning(`${result.message}. Ver detalles en la consola.`);
        console.log("Duplicados encontrados:", result.duplicateDetails);
      } else {
        toast.success(result.message);
      }
      
      setEmployeesFile(null);
    } catch (error: any) {
      toast.error(error.message || "Error al importar trabajadores");
    }
  };

  const downloadTemplate = (type: string) => {
    let templatePath = "";

    if (type === "departments") {
      templatePath = "/templates/departments_template.xlsx";
    } else if (type === "positions") {
      templatePath = "/templates/positions_template.xlsx";
    } else if (type === "employees") {
      templatePath = "/templates/employees_template.xlsx";
    }

    // Crear enlace temporal para descargar el archivo
    const link = document.createElement('a');
    link.href = templatePath;
    link.download = templatePath.split('/').pop() || 'template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importación Masiva</h1>
        <p className="text-muted-foreground mt-2">
          Importa departamentos, puestos y trabajadores desde archivos Excel
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
          <TabsTrigger value="positions">Puestos</TabsTrigger>
          <TabsTrigger value="employees">Trabajadores</TabsTrigger>
        </TabsList>

        {/* Departamentos */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle>Importar Departamentos</CardTitle>
              <CardDescription>
                Carga un archivo Excel con la lista de departamentos a importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate("departments")}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Plantilla
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileChange(e, "departments")}
                  className="hidden"
                  id="departments-file"
                />
                <label htmlFor="departments-file" className="cursor-pointer">
                  <Button variant="secondary" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar Archivo
                    </span>
                  </Button>
                </label>
                {departmentsFile && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Archivo seleccionado: {departmentsFile.name}
                  </p>
                )}
              </div>

              <Button
                onClick={handleImportDepartments}
                disabled={!departmentsFile || importDepartmentsMutation.isPending}
                className="w-full"
              >
                {importDepartmentsMutation.isPending ? "Importando..." : "Importar Departamentos"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Puestos */}
        <TabsContent value="positions">
          <Card>
            <CardHeader>
              <CardTitle>Importar Puestos</CardTitle>
              <CardDescription>
                Carga un archivo Excel con la lista de puestos a importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate("positions")}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Plantilla
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileChange(e, "positions")}
                  className="hidden"
                  id="positions-file"
                />
                <label htmlFor="positions-file" className="cursor-pointer">
                  <Button variant="secondary" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar Archivo
                    </span>
                  </Button>
                </label>
                {positionsFile && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Archivo seleccionado: {positionsFile.name}
                  </p>
                )}
              </div>

              <Button
                onClick={handleImportPositions}
                disabled={!positionsFile || importPositionsMutation.isPending}
                className="w-full"
              >
                {importPositionsMutation.isPending ? "Importando..." : "Importar Puestos"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trabajadores */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Importar Trabajadores</CardTitle>
              <CardDescription>
                Carga un archivo Excel con la lista de trabajadores a importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate("employees")}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Plantilla
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm">
                <p className="font-semibold mb-2">Campos obligatorios:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Nombre (firstName)</li>
                  <li>Apellido (lastName)</li>
                  <li>Correo electrónico (email)</li>
                  <li>Teléfono (phone)</li>
                  <li>CURP (18 caracteres)</li>
                  <li>Número de empleado (employeeNumber)</li>
                  <li>ID de departamento (departmentId)</li>
                  <li>ID de puesto (positionId)</li>
                  <li>Fecha de ingreso (hireDate en formato YYYY-MM-DD)</li>
                </ul>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileChange(e, "employees")}
                  className="hidden"
                  id="employees-file"
                />
                <label htmlFor="employees-file" className="cursor-pointer">
                  <Button variant="secondary" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar Archivo
                    </span>
                  </Button>
                </label>
                {employeesFile && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Archivo seleccionado: {employeesFile.name}
                  </p>
                )}
              </div>

              <Button
                onClick={handleImportEmployees}
                disabled={!employeesFile || importEmployeesMutation.isPending}
                className="w-full"
              >
                {importEmployeesMutation.isPending ? "Importando..." : "Importar Trabajadores"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
