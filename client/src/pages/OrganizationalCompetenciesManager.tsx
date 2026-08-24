import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { loadXlsx } from "@/lib/loadXlsx";

type CompetencyCategory =
  | "soft_skill"
  | "organizational"
  | "leadership"
  | "technical_transversal";
type CompetencyLevel = "basico" | "intermedio" | "avanzado" | "experto";

interface CompetencyFormData {
  competencyName: string;
  description: string;
  competencyCategory: CompetencyCategory;
  requiredLevel: CompetencyLevel;
  appliesToDepartments: string;
  appliesToRoles: string;
}

const initialFormData: CompetencyFormData = {
  competencyName: "",
  description: "",
  competencyCategory: "soft_skill",
  requiredLevel: "intermedio",
  appliesToDepartments: "all",
  appliesToRoles: "all",
};

const categoryLabels: Record<CompetencyCategory, string> = {
  soft_skill: "Habilidad Blanda",
  organizational: "Organizacional",
  leadership: "Liderazgo",
  technical_transversal: "Técnica Transversal",
};

const levelLabels: Record<CompetencyLevel, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  experto: "Experto",
};

const categoryColors: Record<CompetencyCategory, string> = {
  soft_skill: "bg-blue-100 text-blue-800",
  organizational: "bg-green-100 text-green-800",
  leadership: "bg-purple-100 text-purple-800",
  technical_transversal: "bg-orange-100 text-orange-800",
};

export default function OrganizationalCompetenciesManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<
    number | null
  >(null);
  const [formData, setFormData] = useState<CompetencyFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    CompetencyCategory | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    created: number;
    updated: number;
    errors: string[];
    total: number;
  } | null>(null);
  const [isImportResultsOpen, setIsImportResultsOpen] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: competencies = [], isLoading } =
    trpc.organizationalCompetencies.list.useQuery();

  // Mutations
  const createMutation = trpc.organizationalCompetencies.create.useMutation({
    onSuccess: () => {
      toast.success("Competencia creada exitosamente");
      utils.organizationalCompetencies.list.invalidate();
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: error => {
      toast.error(`Error al crear competencia: ${error.message}`);
    },
  });

  const updateMutation = trpc.organizationalCompetencies.update.useMutation({
    onSuccess: () => {
      toast.success("Competencia actualizada exitosamente");
      utils.organizationalCompetencies.list.invalidate();
      setIsEditDialogOpen(false);
      setSelectedCompetencyId(null);
      setFormData(initialFormData);
    },
    onError: error => {
      toast.error(`Error al actualizar competencia: ${error.message}`);
    },
  });

  const bulkImportMutation =
    trpc.organizationalCompetencies.bulkImport.useMutation({
      onSuccess: result => {
        setImportResults(result);
        setIsImportResultsOpen(true);
        setIsImporting(false);
        utils.organizationalCompetencies.list.invalidate();
      },
      onError: (error: any) => {
        toast.error(error.message || "Error al importar competencias");
        setIsImporting(false);
      },
    });

  const handleDownloadTemplate = async () => {
    const XLSX = await loadXlsx();
    const template = [
      [
        "NombreCompetencia",
        "Categoria",
        "NivelRequerido",
        "AplicaDepartamentos",
        "AplicaRoles",
        "Descripcion",
      ],
      [
        "Comunicación Efectiva",
        "soft_skill",
        "intermedio",
        "Todos",
        "Todos",
        "Capacidad de comunicarse con claridad",
      ],
      [
        "Liderazgo de Equipos",
        "leadership",
        "avanzado",
        "Operaciones,Tecnología",
        "Gerente,Supervisor",
        "Liderar equipos de trabajo",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    ws["!cols"] = [
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 30 },
      { wch: 50 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Competencias");
    XLSX.writeFile(wb, "plantilla_importar_competencias.xlsx");
    toast.info(
      "Plantilla descargada. Categorías: soft_skill, organizational, leadership, technical_transversal. Niveles: basico, intermedio, avanzado, experto"
    );
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const XLSX = await loadXlsx();
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(ws);
        const CAT_MAP: Record<string, string> = {
          soft_skill: "soft_skill",
          "habilidad blanda": "soft_skill",
          organizational: "organizational",
          organizacional: "organizational",
          leadership: "leadership",
          liderazgo: "leadership",
          technical_transversal: "technical_transversal",
          "técnica transversal": "technical_transversal",
          "tecnica transversal": "technical_transversal",
        };
        const LVL_MAP: Record<string, string> = {
          basico: "basico",
          básico: "basico",
          intermedio: "intermedio",
          avanzado: "avanzado",
          experto: "experto",
        };
        const parsed = rows
          .map((r: any) => ({
            competencyName: String(
              r.NombreCompetencia || r.Nombre || r.competencyName || ""
            ).trim(),
            competencyCategory: (CAT_MAP[
              (r.Categoria || r.Categoría || r.competencyCategory || "")
                .toString()
                .toLowerCase()
                .trim()
            ] || "soft_skill") as any,
            requiredLevel: (LVL_MAP[
              (r.NivelRequerido || r.Nivel || r.requiredLevel || "")
                .toString()
                .toLowerCase()
                .trim()
            ] || "intermedio") as any,
            appliesToDepartments:
              String(
                r.AplicaDepartamentos || r.appliesToDepartments || ""
              ).trim() || undefined,
            appliesToRoles:
              String(r.AplicaRoles || r.appliesToRoles || "").trim() ||
              undefined,
            description:
              String(
                r.Descripcion || r.Descripción || r.description || ""
              ).trim() || undefined,
          }))
          .filter((r: any) => r.competencyName);
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

  const deleteMutation = trpc.organizationalCompetencies.delete.useMutation({
    onSuccess: () => {
      toast.success("Competencia eliminada exitosamente");
      utils.organizationalCompetencies.list.invalidate();
      setIsDeleteDialogOpen(false);
      setSelectedCompetencyId(null);
    },
    onError: error => {
      toast.error(`Error al eliminar competencia: ${error.message}`);
    },
  });

  // Handlers
  const handleCreate = () => {
    if (!formData.competencyName.trim()) {
      toast.error("El nombre de la competencia es requerido");
      return;
    }
    const payload = {
      ...formData,
      appliesToDepartments:
        formData.appliesToDepartments === "all"
          ? undefined
          : formData.appliesToDepartments.split(",").map(d => d.trim()),
      appliesToRoles:
        formData.appliesToRoles === "all"
          ? undefined
          : formData.appliesToRoles.split(",").map(r => r.trim()),
    };
    createMutation.mutate(payload);
  };

  const handleEdit = (competency: any) => {
    setSelectedCompetencyId(competency.id);
    setFormData({
      competencyName: competency.competencyName,
      description: competency.description || "",
      competencyCategory: competency.competencyCategory,
      requiredLevel: competency.requiredLevel,
      appliesToDepartments: competency.appliesToDepartments || "all",
      appliesToRoles: competency.appliesToRoles || "all",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedCompetencyId) return;
    if (!formData.competencyName.trim()) {
      toast.error("El nombre de la competencia es requerido");
      return;
    }
    const payload = {
      id: selectedCompetencyId,
      ...formData,
      appliesToDepartments:
        formData.appliesToDepartments === "all"
          ? undefined
          : formData.appliesToDepartments.split(",").map(d => d.trim()),
      appliesToRoles:
        formData.appliesToRoles === "all"
          ? undefined
          : formData.appliesToRoles.split(",").map(r => r.trim()),
    };
    updateMutation.mutate(payload);
  };

  const handleDeleteClick = (id: number) => {
    setSelectedCompetencyId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedCompetencyId) return;
    deleteMutation.mutate({ id: selectedCompetencyId });
  };

  // Filtering
  const filteredCompetencies = competencies.filter((comp: any) => {
    const matchesSearch = comp.competencyName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || comp.competencyCategory === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && comp.isActive) ||
      (statusFilter === "inactive" && !comp.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Statistics
  const totalCompetencies = competencies.length;
  const activeCompetencies = competencies.filter((c: any) => c.isActive).length;
  const softSkills = competencies.filter(
    (c: any) => c.competencyCategory === "soft_skill"
  ).length;
  const leadership = competencies.filter(
    (c: any) => c.competencyCategory === "leadership"
  ).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb
        items={[
          {
            label: "Gestión de Talento",
            href: "/",
          },
          {
            label: "Catálogo de Competencias",
          },
        ]}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Catálogo de Competencias Organizacionales
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra el catálogo de habilidades blandas, liderazgo y
            competencias transversales
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              if (!competencies.length) {
                toast.error("No hay competencias para exportar");
                return;
              }
              const XLSX = await loadXlsx();
              const rows = filteredCompetencies.map((c: any) => ({
                Nombre: c.competencyName,
                Categoría:
                  categoryLabels[c.competencyCategory as CompetencyCategory] ??
                  c.competencyCategory,
                "Nivel requerido":
                  levelLabels[c.requiredLevel as CompetencyLevel] ??
                  c.requiredLevel,
                "Aplica a departamentos": c.appliesToDepartments || "Todos",
                "Aplica a roles": c.appliesToRoles || "Todos",
                Estado: c.isActive ? "Activo" : "Inactivo",
                Descripción: c.description || "",
              }));
              const ws = XLSX.utils.json_to_sheet(rows);
              ws["!cols"] = [
                { wch: 35 },
                { wch: 22 },
                { wch: 18 },
                { wch: 28 },
                { wch: 28 },
                { wch: 10 },
                { wch: 60 },
              ];
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Competencias");
              XLSX.writeFile(
                wb,
                `catalogo_competencias_${new Date().toISOString().slice(0, 10)}.xlsx`
              );
              toast.success("Catálogo exportado correctamente");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar XLSX
          </Button>
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
              document.getElementById("import-competencies-file")?.click()
            }
            disabled={isImporting}
            title="Importar competencias desde Excel"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importando..." : "Importar XLSX"}
          </Button>
          <input
            id="import-competencies-file"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Competencia
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{totalCompetencies}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-muted-foreground">Activas</div>
          <div className="text-2xl font-bold text-green-600">
            {activeCompetencies}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-muted-foreground">
            Habilidades Blandas
          </div>
          <div className="text-2xl font-bold text-blue-600">{softSkills}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-muted-foreground">Liderazgo</div>
          <div className="text-2xl font-bold text-purple-600">{leadership}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <h3 className="font-semibold">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar competencia..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as any)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todas las categorías</option>
            <option value="soft_skill">Habilidad Blanda</option>
            <option value="organizational">Organizacional</option>
            <option value="leadership">Liderazgo</option>
            <option value="technical_transversal">Técnica Transversal</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Nivel Requerido</TableHead>
              <TableHead>Aplicable a</TableHead>
              <TableHead>Estado</TableHead>
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
            ) : filteredCompetencies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No se encontraron competencias
                </TableCell>
              </TableRow>
            ) : (
              filteredCompetencies.map((comp: any) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium">
                    {comp.competencyName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        categoryColors[
                          comp.competencyCategory as CompetencyCategory
                        ]
                      }
                    >
                      {
                        categoryLabels[
                          comp.competencyCategory as CompetencyCategory
                        ]
                      }
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {levelLabels[comp.requiredLevel as CompetencyLevel]}
                  </TableCell>
                  <TableCell>
                    {comp.appliesToDepartments === "all"
                      ? "Todos los departamentos"
                      : comp.appliesToDepartments}
                  </TableCell>
                  <TableCell>
                    <Badge variant={comp.isActive ? "default" : "secondary"}>
                      {comp.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(comp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(comp.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Competencia Organizacional</DialogTitle>
            <DialogDescription>
              Crea una nueva competencia para el catálogo organizacional
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre de la Competencia *</Label>
              <Input
                id="name"
                value={formData.competencyName}
                onChange={e =>
                  setFormData({ ...formData, competencyName: e.target.value })
                }
                placeholder="Ej: Comunicación Efectiva"
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe la competencia..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoría *</Label>
                <select
                  id="category"
                  value={formData.competencyCategory}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      competencyCategory: e.target.value as CompetencyCategory,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="soft_skill">Habilidad Blanda</option>
                  <option value="organizational">Organizacional</option>
                  <option value="leadership">Liderazgo</option>
                  <option value="technical_transversal">
                    Técnica Transversal
                  </option>
                </select>
              </div>
              <div>
                <Label htmlFor="requiredLevel">Nivel Requerido *</Label>
                <select
                  id="requiredLevel"
                  value={formData.requiredLevel}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      requiredLevel: e.target.value as CompetencyLevel,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="basico">Básico</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                  <option value="experto">Experto</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="appliesToDepartments">
                Aplicable a Departamentos
              </Label>
              <Input
                id="appliesToDepartments"
                value={formData.appliesToDepartments}
                onChange={e =>
                  setFormData({
                    ...formData,
                    appliesToDepartments: e.target.value,
                  })
                }
                placeholder="all (todos) o lista separada por comas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Escribe "all" para todos los departamentos o lista separada por
                comas
              </p>
            </div>
            <div>
              <Label htmlFor="appliesToRoles">Aplicable a Roles</Label>
              <Input
                id="appliesToRoles"
                value={formData.appliesToRoles}
                onChange={e =>
                  setFormData({ ...formData, appliesToRoles: e.target.value })
                }
                placeholder="all (todos) o lista separada por comas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Escribe "all" para todos los roles o lista separada por comas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleCreate}
              loading={createMutation.isPending}
              loadingText="Creando..."
            >
              Crear Competencia
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Competencia</DialogTitle>
            <DialogDescription>
              Actualiza la información de la competencia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre de la Competencia *</Label>
              <Input
                id="edit-name"
                value={formData.competencyName}
                onChange={e =>
                  setFormData({ ...formData, competencyName: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Categoría *</Label>
                <select
                  id="edit-category"
                  value={formData.competencyCategory}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      competencyCategory: e.target.value as CompetencyCategory,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="soft_skill">Habilidad Blanda</option>
                  <option value="organizational">Organizacional</option>
                  <option value="leadership">Liderazgo</option>
                  <option value="technical_transversal">
                    Técnica Transversal
                  </option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-requiredLevel">Nivel Requerido *</Label>
                <select
                  id="edit-requiredLevel"
                  value={formData.requiredLevel}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      requiredLevel: e.target.value as CompetencyLevel,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="basico">Básico</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                  <option value="experto">Experto</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-appliesToDepartments">
                Aplicable a Departamentos
              </Label>
              <Input
                id="edit-appliesToDepartments"
                value={formData.appliesToDepartments}
                onChange={e =>
                  setFormData({
                    ...formData,
                    appliesToDepartments: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-appliesToRoles">Aplicable a Roles</Label>
              <Input
                id="edit-appliesToRoles"
                value={formData.appliesToRoles}
                onChange={e =>
                  setFormData({ ...formData, appliesToRoles: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleUpdate}
              loading={updateMutation.isPending}
              loadingText="Actualizando..."
            >
              Actualizar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta competencia? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={handleDeleteConfirm}
              loading={deleteMutation.isPending}
              loadingText="Eliminando..."
            >
              Eliminar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
