import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Briefcase,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import ProtectedButton from "@/components/ProtectedButton";
import { toast } from "sonner";
import { loadXlsx } from "@/lib/loadXlsx";

const LEVEL_LABELS: Record<string, string> = {
  executive: "Ejecutivo",
  management: "Gerencial",
  supervisor: "Supervisor",
  specialist: "Especialista",
  entry: "Operativo",
};

export default function Positions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    created: number;
    updated: number;
    errors: string[];
    total: number;
  } | null>(null);
  const [isImportResultsOpen, setIsImportResultsOpen] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<
    number | undefined
  >();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    code: "",
    departmentId: 0,
    level: "specialist" as
      | "executive"
      | "management"
      | "supervisor"
      | "specialist"
      | "entry",
    minimumEducation: "" as
      | "primaria"
      | "secundaria"
      | "preparatoria"
      | "tecnico"
      | "licenciatura"
      | "especialidad"
      | "maestria"
      | "doctorado"
      | "",
  });

  const bulkImportMutation = trpc.positions.bulkImport.useMutation({
    onSuccess: result => {
      setImportResults(result);
      setIsImportResultsOpen(true);
      setIsImporting(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al importar puestos");
      setIsImporting(false);
    },
  });

  const handleDownloadTemplate = async () => {
    const XLSX = await loadXlsx();
    const template = [
      [
        "Codigo",
        "Titulo",
        "Departamento",
        "Nivel",
        "EscolaridadMinima",
        "Descripcion",
      ],
      [
        "GTE-001",
        "Gerente de Tecnología",
        "Tecnología",
        "management",
        "licenciatura",
        "Responsable del área de TI",
      ],
      [
        "OPE-001",
        "Operador de Producción",
        "Operaciones",
        "entry",
        "preparatoria",
        "Operación de maquinaria",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 35 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 50 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Puestos");
    XLSX.writeFile(wb, "plantilla_importar_puestos.xlsx");
    toast.info(
      "Plantilla descargada. Niveles válidos: executive, management, supervisor, specialist, entry"
    );
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const XLSX = await loadXlsx();
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(ws);
        const LEVEL_MAP: Record<string, string> = {
          ejecutivo: "executive",
          executive: "executive",
          gerencial: "management",
          management: "management",
          supervisor: "supervisor",
          especialista: "specialist",
          specialist: "specialist",
          operativo: "entry",
          entry: "entry",
        };
        const EDU_MAP: Record<string, string> = {
          primaria: "primaria",
          secundaria: "secundaria",
          preparatoria: "preparatoria",
          tecnico: "tecnico",
          técnico: "tecnico",
          licenciatura: "licenciatura",
          especialidad: "especialidad",
          maestria: "maestria",
          maestría: "maestria",
          doctorado: "doctorado",
        };
        const parsed = rows
          .map((r: any) => ({
            code: String(r.Codigo || r.Código || r.code || "").trim(),
            title: String(r.Titulo || r.Título || r.title || "").trim(),
            departmentName:
              String(r.Departamento || r.departmentName || "").trim() ||
              undefined,
            level:
              (LEVEL_MAP[
                (r.Nivel || r.level || "").toString().toLowerCase().trim()
              ] as any) || undefined,
            minimumEducation:
              (EDU_MAP[
                (
                  r.EscolaridadMinima ||
                  r.Escolaridad ||
                  r.minimumEducation ||
                  ""
                )
                  .toString()
                  .toLowerCase()
                  .trim()
              ] as any) || undefined,
            description:
              String(
                r.Descripcion || r.Descripción || r.description || ""
              ).trim() || undefined,
          }))
          .filter((r: any) => r.code && r.title);
        if (parsed.length === 0) {
          toast.error(
            "No se encontraron filas válidas. Verifica las columnas del archivo."
          );
          setIsImporting(false);
          return;
        }
        bulkImportMutation.mutate({ rows: parsed });
      } catch {
        toast.error("Error al leer el archivo Excel");
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const { data, isLoading, refetch } = trpc.positions.list.useQuery({
    page,
    pageSize: 10,
    search: search || undefined,
    departmentId: filterDepartment,
  });

  const { data: departments } = trpc.departments.list.useQuery({
    page: 1,
    pageSize: 100,
    isActive: true,
  });

  const createMutation = trpc.positions.create.useMutation({
    onSuccess: () => {
      toast.success("Puesto creado exitosamente");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear puesto");
    },
  });

  const updateMutation = trpc.positions.update.useMutation({
    onSuccess: () => {
      toast.success("Puesto actualizado exitosamente");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar puesto");
    },
  });

  const deleteMutation = trpc.positions.delete.useMutation({
    onSuccess: () => {
      toast.success("Puesto eliminado exitosamente");
      setIsDeleteOpen(false);
      setSelectedPosition(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar puesto");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      code: "",
      departmentId: 0,
      level: "specialist",
      minimumEducation: "" as any,
    });
    setSelectedPosition(null);
  };

  const handleCreate = () => {
    if (
      !formData.title.trim() ||
      !formData.code.trim() ||
      !formData.departmentId
    ) {
      toast.error("El título, código y departamento son obligatorios");
      return;
    }
    createMutation.mutate({
      ...formData,
      minimumEducation: (formData.minimumEducation || null) as any,
    });
  };

  const handleEdit = (position: any) => {
    setSelectedPosition(position);
    setFormData({
      title: position.title,
      description: position.description || "",
      code: position.code,
      departmentId: position.departmentId,
      level: position.level || "specialist",
      minimumEducation: position.minimumEducation || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.title.trim() || !formData.code.trim()) {
      toast.error("El título y código son obligatorios");
      return;
    }
    updateMutation.mutate({
      id: selectedPosition.id,
      ...formData,
      minimumEducation: (formData.minimumEducation || null) as any,
    });
  };

  const handleDelete = (position: any) => {
    setSelectedPosition(position);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPosition) {
      deleteMutation.mutate({ id: selectedPosition.id });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Puestos</h1>
          <p className="text-muted-foreground">
            Gestión de puestos organizacionales
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            title="Descargar plantilla Excel para importar"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Plantilla
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              document.getElementById("import-positions-file")?.click()
            }
            disabled={isImporting}
            title="Importar puestos desde Excel"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importando..." : "Importar XLSX"}
          </Button>
          <input
            id="import-positions-file"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="outline"
            onClick={async () => {
              if (!data?.data?.length) {
                toast.error("No hay puestos para exportar");
                return;
              }
              const XLSX = await loadXlsx();
              const rows = data.data.map((p: any) => ({
                Código: p.code,
                Título: p.title,
                Departamento: p.departmentName || "",
                Nivel: p.level ? (LEVEL_LABELS[p.level] ?? p.level) : "",
                "Escolaridad mínima": p.minimumEducation || "",
                "Empleados asignados": p.employeeCount ?? 0,
                Descripción: p.description || "",
              }));
              const ws = XLSX.utils.json_to_sheet(rows);
              // Ajustar ancho de columnas
              ws["!cols"] = [
                { wch: 12 },
                { wch: 35 },
                { wch: 25 },
                { wch: 15 },
                { wch: 20 },
                { wch: 12 },
                { wch: 50 },
              ];
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Catálogo de Puestos");
              XLSX.writeFile(
                wb,
                `catalogo_puestos_${new Date().toISOString().slice(0, 10)}.xlsx`
              );
              toast.success("Catálogo exportado correctamente");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar XLSX
          </Button>
          <ProtectedButton
            onClick={() => setIsCreateOpen(true)}
            requiredPermission="can_create"
            fallbackMessage="Solo los administradores pueden crear puestos"
            hideIfNoPermission
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Puesto
          </ProtectedButton>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar puestos..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={filterDepartment?.toString() || "all"}
          onValueChange={value => {
            setFilterDepartment(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departments?.data.map((dept: any) => (
              <SelectItem key={dept.id} value={dept.id.toString()}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>
                <Briefcase className="inline h-4 w-4 mr-1" />
                Departamento
              </TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead className="text-center">
                <Users className="inline h-4 w-4 mr-1" />
                Empleados
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No se encontraron puestos
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((pos: any) => (
                <TableRow key={pos.id}>
                  <TableCell className="font-mono">{pos.code}</TableCell>
                  <TableCell className="font-medium">{pos.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {pos.departmentName || "—"}
                  </TableCell>
                  <TableCell>
                    {pos.level ? LEVEL_LABELS[pos.level] : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {pos.employeeCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <ProtectedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(pos)}
                      requiredPermission="can_edit"
                      fallbackMessage="Solo los administradores pueden editar puestos"
                      hideIfNoPermission
                    >
                      <Pencil className="h-4 w-4" />
                    </ProtectedButton>
                    <ProtectedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(pos)}
                      requiredPermission="can_delete"
                      fallbackMessage="Solo los administradores pueden eliminar puestos"
                      hideIfNoPermission
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </ProtectedButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {page} de {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= data.pagination.totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Diálogo Crear */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Puesto</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo puesto
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                placeholder="Ej: GER-001"
                value={formData.code}
                onChange={e =>
                  setFormData({ ...formData, code: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ej: Gerente de Recursos Humanos"
                value={formData.title}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="department">Departamento *</Label>
              <Select
                value={formData.departmentId.toString()}
                onValueChange={value =>
                  setFormData({ ...formData, departmentId: Number(value) })
                }
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Selecciona un departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.data.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="level">Nivel</Label>
              <Select
                value={formData.level}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, level: value })
                }
              >
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="minimumEducation">Escolaridad Mínima</Label>
              <Select
                value={formData.minimumEducation || ""}
                onValueChange={(value: any) =>
                  setFormData({
                    ...formData,
                    minimumEducation: value === "_none" ? "" : value,
                  })
                }
              >
                <SelectTrigger id="minimumEducation">
                  <SelectValue placeholder="Sin requisito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin requisito</SelectItem>
                  <SelectItem value="primaria">Primaria</SelectItem>
                  <SelectItem value="secundaria">Secundaria</SelectItem>
                  <SelectItem value="preparatoria">
                    Preparatoria / Bachillerato
                  </SelectItem>
                  <SelectItem value="tecnico">
                    Técnico / Carrera Técnica
                  </SelectItem>
                  <SelectItem value="licenciatura">Licenciatura</SelectItem>
                  <SelectItem value="especialidad">Especialidad</SelectItem>
                  <SelectItem value="maestria">Maestría</SelectItem>
                  <SelectItem value="doctorado">Doctorado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del puesto"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleCreate}
              loading={createMutation.isPending}
              loadingText="Creando..."
            >
              Crear
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Editar */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Puesto</DialogTitle>
            <DialogDescription>Modifica los datos del puesto</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-code">Código *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={e =>
                  setFormData({ ...formData, code: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-department">Departamento *</Label>
              <Select
                value={formData.departmentId.toString()}
                onValueChange={value =>
                  setFormData({ ...formData, departmentId: Number(value) })
                }
              >
                <SelectTrigger id="edit-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments?.data.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-level">Nivel</Label>
              <Select
                value={formData.level}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, level: value })
                }
              >
                <SelectTrigger id="edit-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-minimumEducation">Escolaridad Mínima</Label>
              <Select
                value={formData.minimumEducation || ""}
                onValueChange={(value: any) =>
                  setFormData({
                    ...formData,
                    minimumEducation: value === "_none" ? "" : value,
                  })
                }
              >
                <SelectTrigger id="edit-minimumEducation">
                  <SelectValue placeholder="Sin requisito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin requisito</SelectItem>
                  <SelectItem value="primaria">Primaria</SelectItem>
                  <SelectItem value="secundaria">Secundaria</SelectItem>
                  <SelectItem value="preparatoria">
                    Preparatoria / Bachillerato
                  </SelectItem>
                  <SelectItem value="tecnico">
                    Técnico / Carrera Técnica
                  </SelectItem>
                  <SelectItem value="licenciatura">Licenciatura</SelectItem>
                  <SelectItem value="especialidad">Especialidad</SelectItem>
                  <SelectItem value="maestria">Maestría</SelectItem>
                  <SelectItem value="doctorado">Doctorado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleUpdate}
              loading={updateMutation.isPending}
              loadingText="Guardando..."
            >
              Guardar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Resultados de Importación */}
      <Dialog open={isImportResultsOpen} onOpenChange={setIsImportResultsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultados de Importación</DialogTitle>
            <DialogDescription>
              Resumen del proceso de importación de puestos
            </DialogDescription>
          </DialogHeader>
          {importResults && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {importResults.created}
                  </div>
                  <div className="text-xs text-muted-foreground">Creados</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {importResults.updated}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Actualizados
                  </div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {importResults.errors.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Errores</div>
                </div>
              </div>
              {importResults.errors.length > 0 && (
                <div className="border rounded p-3 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-destructive mb-2">
                    Errores:
                  </p>
                  {importResults.errors.map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {err}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center">
                Total procesado: {importResults.total} filas
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsImportResultsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Eliminar */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el puesto "
              {selectedPosition?.title}" permanentemente.
              {selectedPosition?.employeeCount > 0 && (
                <span className="block mt-2 text-destructive font-semibold">
                  Advertencia: Este puesto tiene{" "}
                  {selectedPosition.employeeCount} empleado(s) asignado(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
