import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Upload, Filter, TrendingUp, AlertCircle } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SkillLevel = "Sin evaluar" | "Básico" | "Intermedio" | "Avanzado" | "Experto";

const levelColors: Record<SkillLevel, string> = {
  "Sin evaluar": "bg-gray-200 text-gray-700",
  "Básico": "bg-red-100 text-red-700",
  "Intermedio": "bg-yellow-100 text-yellow-700",
  "Avanzado": "bg-blue-100 text-blue-700",
  "Experto": "bg-green-100 text-green-700",
};

const levelValues: Record<SkillLevel, number> = {
  "Sin evaluar": 0,
  "Básico": 1,
  "Intermedio": 2,
  "Avanzado": 3,
  "Experto": 4,
};

export default function SkillsMatrix() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [filters, setFilters] = useState({
    departmentId: undefined as number | undefined,
    positionId: undefined as number | undefined,
    employeeName: "",
  });
  
  const [editingCell, setEditingCell] = useState<{
    employeeId: number;
    competencyId: number;
    currentLevel: SkillLevel;
  } | null>(null);
  
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Queries
  const { data: matrixData, isLoading, refetch } = trpc.skillsMatrix.getMatrix.useQuery(filters);
  const { data: importHistory } = trpc.skillsMatrix.getImportHistory.useQuery();

  // Mutations
  const updateSkillMutation = trpc.skillsMatrix.setEmployeeSkillLevel.useMutation({
    onSuccess: () => {
      toast.success("Nivel actualizado", { description: "El nivel de habilidad se actualizó correctamente" });
      refetch();
      setEditingCell(null);
    },
    onError: (error: { message: string }) => {
      toast.error("Error", { description: error.message });
    },
  });

  const importMutation = trpc.skillsMatrix.importFromExcel.useMutation({
    onSuccess: (result) => {
      toast.success("Importación completada", {
        description: `${result.recordsImported} registros importados, ${result.recordsFailed} fallidos`,
      });
      refetch();
      setImportDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (error: { message: string }) => {
      toast.error("Error en importación", { description: error.message });
    },
  });

  const handleUpdateSkill = (employeeId: number, competencyId: number, level: SkillLevel) => {
    updateSkillMutation.mutate({ employeeId, competencyId, level });
  };

  const handleExport = async () => {
    try {
      const utils = trpc.useUtils();
      const data = await utils.skillsMatrix.exportToExcel.fetch({
        departmentId: filters.departmentId,
      });
      
      // Convert data to CSV
      if (data.data.length === 0) {
        toast.error("Sin datos", { description: "No hay datos para exportar" });
        return;
      }

      const headers = Object.keys(data.data[0]);
      const csvContent = [
        headers.join(","),
        ...data.data.map((row: Record<string, unknown>) => 
          headers.map(h => {
            const value = row[h];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          }).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `matriz_habilidades_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Exportación exitosa", { description: "La matriz se exportó correctamente" });
    } catch (error) {
      toast.error("Error", { description: "No se pudo exportar la matriz" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportDialogOpen(true);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim());
        const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ''));
        
        const data = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.trim().replace(/"/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });
          return row;
        });

        // Transform data to match import format
        const importData = data.flatMap(row => {
          const email = row.email;
          const competencies: Array<{ name: string; level: SkillLevel; notes?: string }> = [];
          
          Object.keys(row).forEach(key => {
            if (key !== 'email' && key !== 'nombre' && key !== 'departamento' && key !== 'puesto') {
              const level = row[key] as SkillLevel;
              if (level && level !== "Sin evaluar") {
                competencies.push({ name: key, level });
              }
            }
          });

          return competencies.map(comp => ({
            employeeEmail: email,
            competencyName: comp.name,
            level: comp.level,
            notes: comp.notes,
          }));
        });

        await importMutation.mutateAsync({ 
          fileName: selectedFile.name,
          data: importData 
        });
      } catch (error) {
        toast.error("Error", { description: "No se pudo procesar el archivo" });
      }
    };
    reader.readAsText(selectedFile);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
      <Breadcrumb items={[
        {
                label: "Gestión de Talento",
                href: "/"
        },
        {
                label: "Matriz de Habilidades"
        }
]} />

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando matriz de habilidades...</p>
          </div>
        </div>
      </div>
    );
  }

  const employees = matrixData?.employees || [];
  const competencies = matrixData?.competencies || [];
  const matrix = matrixData?.matrixEntries || [];
  const departmentAverage = matrixData?.departmentAverage || 0;
  const competencyAverages = matrixData?.competencyAverages || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Matriz de Habilidades</h1>
          <p className="text-muted-foreground">
            Vista organizacional de competencias y niveles de habilidad
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Buscar Empleado</Label>
              <Input
                placeholder="Nombre del empleado..."
                value={filters.employeeName}
                onChange={(e) => setFilters({ ...filters, employeeName: e.target.value })}
              />
            </div>
            <div>
              <Label>Departamento</Label>
              <Select
                value={filters.departmentId?.toString()}
                onValueChange={(value) =>
                  setFilters({ ...filters, departmentId: value ? parseInt(value) : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Recursos Humanos</SelectItem>
                  <SelectItem value="2">Operaciones</SelectItem>
                  <SelectItem value="3">Administración</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Puesto</Label>
              <Select
                value={filters.positionId?.toString()}
                onValueChange={(value) =>
                  setFilters({ ...filters, positionId: value ? parseInt(value) : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los puestos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Analista</SelectItem>
                  <SelectItem value="2">Coordinador</SelectItem>
                  <SelectItem value="3">Gerente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Evaluados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">
              {competencies.length} competencias evaluadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nivel Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentAverage.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              De 4.0 posible (Experto)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brechas Detectadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competencyAverages.filter((c: { average: number }) => c.average < 2).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Competencias con nivel bajo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Competencias</CardTitle>
          <CardDescription>
            Haz clic en una celda para editar el nivel de habilidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                    Empleado
                  </TableHead>
                  <TableHead className="min-w-[120px]">Departamento</TableHead>
                  <TableHead className="min-w-[120px]">Puesto</TableHead>
                  {competencies.map((comp: { id: number; name: string }) => (
                    <TableHead key={comp.id} className="min-w-[120px] text-center">
                      {comp.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={competencies.length + 3} className="text-center py-8">
                      <p className="text-muted-foreground">
                        No hay empleados que coincidan con los filtros
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp: { id: number; firstName: string; lastName: string; department: string | null; position: string | null }) => (
                    <TableRow key={emp.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {emp.firstName} {emp.lastName}
                      </TableCell>
                      <TableCell>{emp.department || 'Sin departamento'}</TableCell>
                      <TableCell>{emp.position || 'Sin puesto'}</TableCell>
                      {competencies.map((comp: { id: number }) => {
                        const entry = matrix.find(
                          (m: { employeeId: number; competencyId: number }) =>
                            m.employeeId === emp.id && m.competencyId === comp.id
                        );
                        const level: SkillLevel = (entry?.level as SkillLevel) || "Sin evaluar";
                        
                        return (
                          <TableCell key={comp.id} className="text-center">
                            <Badge
                              className={`cursor-pointer ${levelColors[level]}`}
                              onClick={() =>
                                setEditingCell({
                                  employeeId: emp.id,
                                  competencyId: comp.id,
                                  currentLevel: level,
                                })
                              }
                            >
                              {level}
                            </Badge>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCell} onOpenChange={() => setEditingCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Nivel de Habilidad</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo nivel para esta competencia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nivel Actual: {editingCell?.currentLevel}</Label>
              <Select
                defaultValue={editingCell?.currentLevel}
                onValueChange={(value) => {
                  if (editingCell) {
                    handleUpdateSkill(
                      editingCell.employeeId,
                      editingCell.competencyId,
                      value as SkillLevel
                    );
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sin evaluar">Sin evaluar</SelectItem>
                  <SelectItem value="Básico">Básico</SelectItem>
                  <SelectItem value="Intermedio">Intermedio</SelectItem>
                  <SelectItem value="Avanzado">Avanzado</SelectItem>
                  <SelectItem value="Experto">Experto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Matriz desde Excel</DialogTitle>
            <DialogDescription>
              Archivo seleccionado: {selectedFile?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              El archivo debe tener las siguientes columnas: email, nombre, departamento, puesto, y
              una columna por cada competencia con los niveles correspondientes.
            </p>
            {importHistory && importHistory.length > 0 && (
              <div className="space-y-2">
                <Label>Últimas Importaciones</Label>
                <div className="text-sm space-y-1">
                  {importHistory.slice(0, 3).map((imp: { id: number; recordsImported: number; recordsFailed: number; createdAt: Date }) => (
                    <div key={imp.id} className="flex justify-between">
                      <span>{new Date(imp.createdAt).toLocaleString()}</span>
                      <span className="text-muted-foreground">
                        {imp.recordsImported} importados, {imp.recordsFailed} fallidos
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
