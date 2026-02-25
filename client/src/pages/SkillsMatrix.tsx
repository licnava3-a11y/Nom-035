import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { Download, Upload, Filter, TrendingUp, AlertCircle, Sparkles, Camera, History } from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";
import { Breadcrumb } from "@/components/Breadcrumb";
import { HeatmapExport } from "@/components/HeatmapExport";
import { BulkHeatmapExport } from "@/components/BulkHeatmapExport";
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
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotDescription, setSnapshotDescription] = useState("");

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

  const generateTrainingProgramMutation = trpc.skillsMatrix.generateTrainingProgram.useMutation({
    onSuccess: (result) => {
      toast.success("¡Programa de Capacitación Generado!", {
        description: `${result.totalCompetenciesAdded} competencias agregadas para ${result.totalEmployees} empleados`,
      });
    },
    onError: (error: { message: string }) => {
      toast.error("Error al generar programa", { description: error.message });
    },
  });

  const saveSnapshotMutation = trpc.skillsMatrixSnapshots.saveSnapshot.useMutation({
    onSuccess: () => {
      toast.success("Snapshot guardado", { description: "El snapshot se guardó exitosamente" });
      setSnapshotDialogOpen(false);
      setSnapshotName("");
      setSnapshotDescription("");
    },
    onError: (error: { message: string }) => {
      toast.error("Error", { description: error.message });
    },
  });

  const handleUpdateSkill = (employeeId: number, competencyId: number, level: SkillLevel) => {
    updateSkillMutation.mutate({ employeeId, competencyId, level });
  };

  const handleGenerateTrainingProgram = () => {
    if (window.confirm("¿Deseas generar automáticamente el programa de capacitación basado en las brechas de habilidades identificadas?\n\nEsto agregará las competencias prioritarias al programa personal de cada empleado.")) {
      generateTrainingProgramMutation.mutate({
        departmentId: filters.departmentId,
      });
    }
  };

  const handleSaveSnapshot = () => {
    if (!snapshotName.trim()) {
      toast.error("Error", { description: "El nombre del snapshot es requerido" });
      return;
    }
    
    saveSnapshotMutation.mutate({
      name: snapshotName,
      description: snapshotDescription || undefined,
      departmentId: filters.departmentId,
    });
  };

  const handleExport = async () => {
    try {
      const utils = trpc.useUtils();
      const data = await utils.skillsMatrix.exportToExcel.fetch({
        departmentId: filters.departmentId,
      });
      
      if (data.data.length === 0) {
        toast.error("Sin datos", { description: "No hay datos para exportar" });
        return;
      }

      // Prepare metadata
      const now = new Date();
      const metadata = [
        ['Matriz de Habilidades - NOM-035 STPS 2018'],
        ['Fecha de Exportación:', now.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })],
        ['Filtros Aplicados:'],
        ['  - Departamento:', filters.departmentId ? 'Filtrado' : 'Todos'],
        ['  - Puesto:', filters.positionId ? 'Filtrado' : 'Todos'],
        ['  - Empleado:', filters.employeeName || 'Todos'],
        ['Total de Registros:', data.data.length.toString()],
        [], // Empty row
      ];

      // Create workbook with metadata
      const wb = XLSX.utils.book_new();
      
      // === HOJA 1: Matriz de Habilidades ===
      const ws = XLSX.utils.aoa_to_sheet(metadata);
      XLSX.utils.sheet_add_json(ws, data.data, { origin: -1, skipHeader: false });
      XLSX.utils.book_append_sheet(wb, ws, "Matriz de Habilidades");

      // Auto-size columns for main sheet
      const maxWidth = 50;
      const headers = Object.keys(data.data[0]);
      const colWidths = headers.map(key => {
        const maxLen = Math.max(
          key.length,
          ...data.data.map((row: Record<string, unknown>) => String(row[key] || '').length)
        );
        return { wch: Math.min(maxLen + 2, maxWidth) };
      });
      ws['!cols'] = colWidths;

      // === HOJA 2: Análisis de Desarrollo ===
      if (data.developmentAnalysis && data.developmentAnalysis.length > 0) {
        const devMetadata = [
          ['Análisis de Desarrollo Individual'],
          ['Fecha:', now.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })],
          ['Descripción:', 'Brechas de habilidades y sugerencias de capacitación por empleado'],
          [],
        ];
        const wsDevAnalysis = XLSX.utils.aoa_to_sheet(devMetadata);
        XLSX.utils.sheet_add_json(wsDevAnalysis, data.developmentAnalysis, { origin: -1, skipHeader: false });
        XLSX.utils.book_append_sheet(wb, wsDevAnalysis, "Análisis de Desarrollo");
        
        // Auto-size columns
        const devHeaders = Object.keys(data.developmentAnalysis[0]);
        const devColWidths = devHeaders.map(key => {
          const maxLen = Math.max(
            key.length,
            ...data.developmentAnalysis.map((row: Record<string, unknown>) => String(row[key] || '').length)
          );
          return { wch: Math.min(maxLen + 2, maxWidth) };
        });
        wsDevAnalysis['!cols'] = devColWidths;
      }

      // === HOJA 3: Candidatos para Sucesión ===
      if (data.successionAnalysis) {
        const successionData: any[] = [];
        Object.keys(data.successionAnalysis).forEach((dept) => {
          successionData.push({ departamento: dept, nombre: '', puesto: '', nivelPromedio: '', potencial: '' });
          data.successionAnalysis[dept].forEach((candidate: any) => {
            successionData.push({
              departamento: '',
              nombre: candidate.nombre,
              puesto: candidate.puesto,
              nivelPromedio: candidate.nivelPromedio,
              potencial: candidate.potencial,
            });
          });
          successionData.push({ departamento: '', nombre: '', puesto: '', nivelPromedio: '', potencial: '' }); // Empty row
        });

        const succMetadata = [
          ['Candidatos para Sucesión por Departamento'],
          ['Fecha:', now.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })],
          ['Descripción:', 'Empleados con mayor potencial ordenados por nivel de competencia'],
          [],
        ];
        const wsSuccession = XLSX.utils.aoa_to_sheet(succMetadata);
        XLSX.utils.sheet_add_json(wsSuccession, successionData, { origin: -1, skipHeader: false });
        XLSX.utils.book_append_sheet(wb, wsSuccession, "Candidatos Sucesión");
      }

      // === HOJA 4: Sugerencias de Capacitación ===
      if (data.trainingRecommendations) {
        const trainingData: any[] = [];
        Object.keys(data.trainingRecommendations).forEach((dept) => {
          trainingData.push({ departamento: dept, competencia: '', nivelPromedio: '', prioridad: '' });
          data.trainingRecommendations[dept].forEach((rec: any) => {
            trainingData.push({
              departamento: '',
              competencia: rec.competencia,
              nivelPromedio: rec.nivelPromedio,
              prioridad: rec.prioridad,
            });
          });
          trainingData.push({ departamento: '', competencia: '', nivelPromedio: '', prioridad: '' }); // Empty row
        });

        const trainMetadata = [
          ['Sugerencias de Capacitación Crítica por Departamento'],
          ['Fecha:', now.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })],
          ['Descripción:', 'Top 5 competencias con mayor brecha por departamento'],
          [],
        ];
        const wsTraining = XLSX.utils.aoa_to_sheet(trainMetadata);
        XLSX.utils.sheet_add_json(wsTraining, trainingData, { origin: -1, skipHeader: false });
        XLSX.utils.book_append_sheet(wb, wsTraining, "Capacitación Crítica");
      }

      // === HOJA 5: Resumen Ejecutivo ===
      if (data.developmentAnalysis && data.developmentAnalysis.length > 0) {
        // Calculate KPIs
        const totalEmployees = data.developmentAnalysis.length;
        const avgCompetencyLevel = (data.developmentAnalysis.reduce((sum: number, emp: any) => 
          sum + parseFloat(emp.nivelPromedio || '0'), 0) / totalEmployees).toFixed(2);
        const employeesWithGaps = data.developmentAnalysis.filter((emp: any) => 
          emp.brechasIdentificadas > 0).length;
        const gapPercentage = ((employeesWithGaps / totalEmployees) * 100).toFixed(1);
        const totalDepartments = Object.keys(data.successionAnalysis || {}).length;
        const highPotentialCount = data.developmentAnalysis.filter((emp: any) => 
          parseFloat(emp.nivelPromedio || '0') >= 3).length;
        
        const executiveSummary = [
          ['RESUMEN EJECUTIVO - ANÁLISIS DE DESARROLLO Y SUCESIÓN'],
          ['Fecha de Generación:', now.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })],
          [''],
          ['INDICADORES CLAVE DE DESEMPEÑO (KPIs)'],
          [''],
          ['Métrica', 'Valor', 'Interpretación'],
          ['Total de Empleados Evaluados', totalEmployees.toString(), 'Plantilla activa'],
          ['Nivel Promedio de Competencia', avgCompetencyLevel, 'Escala: 0 (Sin evaluar) a 4 (Experto)'],
          ['Empleados con Brechas de Habilidades', `${employeesWithGaps} (${gapPercentage}%)`, 'Requieren capacitación'],
          ['Empleados de Alto Potencial', `${highPotentialCount} (${((highPotentialCount/totalEmployees)*100).toFixed(1)}%)`, 'Nivel ≥ 3.0 (Avanzado)'],
          ['Departamentos Analizados', totalDepartments.toString(), 'Áreas organizacionales'],
          [''],
          ['DISTRIBUCIÓN POR NIVEL DE COMPETENCIA'],
          [''],
          ['Nivel', 'Cantidad', 'Porcentaje'],
        ];

        // Calculate distribution by level
        const levelCounts = { '0-1': 0, '1-2': 0, '2-3': 0, '3-4': 0 };
        data.developmentAnalysis.forEach((emp: any) => {
          const level = parseFloat(emp.nivelPromedio || '0');
          if (level < 1) levelCounts['0-1']++;
          else if (level < 2) levelCounts['1-2']++;
          else if (level < 3) levelCounts['2-3']++;
          else levelCounts['3-4']++;
        });

        executiveSummary.push(
          ['Sin evaluar / Básico (0-1)', levelCounts['0-1'].toString(), `${((levelCounts['0-1']/totalEmployees)*100).toFixed(1)}%`],
          ['Básico / Intermedio (1-2)', levelCounts['1-2'].toString(), `${((levelCounts['1-2']/totalEmployees)*100).toFixed(1)}%`],
          ['Intermedio / Avanzado (2-3)', levelCounts['2-3'].toString(), `${((levelCounts['2-3']/totalEmployees)*100).toFixed(1)}%`],
          ['Avanzado / Experto (3-4)', levelCounts['3-4'].toString(), `${((levelCounts['3-4']/totalEmployees)*100).toFixed(1)}%`],
          [''],
          ['RECOMENDACIONES ESTRATÉGICAS'],
          [''],
          ['1. Priorizar capacitación en competencias críticas identificadas en la hoja "Capacitación Crítica"'],
          ['2. Desarrollar planes de carrera para empleados de alto potencial (hoja "Candidatos Sucesión")'],
          ['3. Implementar programas de mentoría para cerrar brechas de habilidades'],
          ['4. Revisar perfiles de puesto y alinear con competencias requeridas'],
          ['5. Establecer programa de evaluación continua (trimestral o semestral)'],
        );

        const wsExecutive = XLSX.utils.aoa_to_sheet(executiveSummary);
        XLSX.utils.book_append_sheet(wb, wsExecutive, "Resumen Ejecutivo");
        
        // Auto-size columns
        wsExecutive['!cols'] = [
          { wch: 40 },
          { wch: 20 },
          { wch: 50 },
        ];
      }

      // Generate filename with timestamp
      const timestamp = now.toISOString().split('T')[0];
      const filename = `matriz_habilidades_analisis_${timestamp}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);
      toast.success(`Exportación exitosa: ${data.data.length} empleados + análisis completo`);
    } catch (error: any) {
      console.error("Error al exportar:", error);
      toast.error("Error", { description: error.message || "No se pudo exportar la matriz" });
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
          <Link href="/talent/skills-matrix/snapshots">
            <Button variant="outline" size="sm">
              <History className="mr-2 h-4 w-4" />
              Ver Snapshots
            </Button>
          </Link>
          <Button onClick={() => setSnapshotDialogOpen(true)} variant="outline" size="sm">
            <Camera className="mr-2 h-4 w-4" />
            Guardar Snapshot
          </Button>
          <BulkHeatmapExport companyName="Plataforma NOM-035" />
          <HeatmapExport 
            targetElementId="skills-matrix-table" 
            filename="matriz_habilidades"
            companyName="Plataforma NOM-035"
          />
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
          <Button onClick={handleGenerateTrainingProgram} variant="default" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
            <Sparkles className="mr-2 h-4 w-4" />
            Generar Programa de Capacitación
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
                value={filters.departmentId?.toString() || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, departmentId: value === "all" ? undefined : parseInt(value) })
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
                value={filters.positionId?.toString() || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, positionId: value === "all" ? undefined : parseInt(value) })
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
            <Table id="skills-matrix-table">
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

      {/* Snapshot Dialog */}
      <Dialog open={snapshotDialogOpen} onOpenChange={setSnapshotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar Snapshot de Matriz de Habilidades</DialogTitle>
            <DialogDescription>
              Guarda el estado actual de la matriz para comparación temporal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="snapshot-name">Nombre del Snapshot *</Label>
              <Input
                id="snapshot-name"
                placeholder="Ej: Evaluación Q1 2026"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="snapshot-description">Descripción (opcional)</Label>
              <Input
                id="snapshot-description"
                placeholder="Ej: Evaluación trimestral del primer trimestre"
                value={snapshotDescription}
                onChange={(e) => setSnapshotDescription(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filters.departmentId 
                ? "Se guardará solo el departamento filtrado" 
                : "Se guardará toda la organización"}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapshotDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleSaveSnapshot} loading={saveSnapshotMutation.isPending} loadingText="Guardando...">Guardar Snapshot</LoadingButton>
          </DialogFooter>
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
            <LoadingButton onClick={handleImport} loading={importMutation.isPending} loadingText="Importando...">Importar</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
