import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

type CompetencyCategory = "soft_skill" | "organizational" | "leadership" | "technical_transversal";
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
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CompetencyFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CompetencyCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const utils = trpc.useUtils();

  // Queries
  const { data: competencies = [], isLoading } = trpc.organizationalCompetencies.list.useQuery();

  // Mutations
  const createMutation = trpc.organizationalCompetencies.create.useMutation({
    onSuccess: () => {
      toast.success("Competencia creada exitosamente");
      utils.organizationalCompetencies.list.invalidate();
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
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
    onError: (error) => {
      toast.error(`Error al actualizar competencia: ${error.message}`);
    },
  });

  const deleteMutation = trpc.organizationalCompetencies.delete.useMutation({
    onSuccess: () => {
      toast.success("Competencia eliminada exitosamente");
      utils.organizationalCompetencies.list.invalidate();
      setIsDeleteDialogOpen(false);
      setSelectedCompetencyId(null);
    },
    onError: (error) => {
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
      appliesToDepartments: formData.appliesToDepartments === "all" ? undefined : formData.appliesToDepartments.split(",").map(d => d.trim()),
      appliesToRoles: formData.appliesToRoles === "all" ? undefined : formData.appliesToRoles.split(",").map(r => r.trim()),
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
      appliesToDepartments: formData.appliesToDepartments === "all" ? undefined : formData.appliesToDepartments.split(",").map(d => d.trim()),
      appliesToRoles: formData.appliesToRoles === "all" ? undefined : formData.appliesToRoles.split(",").map(r => r.trim()),
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
  const filteredCompetencies = competencies.filter((comp) => {
    const matchesSearch = comp.competencyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || comp.competencyCategory === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && comp.isActive) ||
      (statusFilter === "inactive" && !comp.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Statistics
  const totalCompetencies = competencies.length;
  const activeCompetencies = competencies.filter((c) => c.isActive).length;
  const softSkills = competencies.filter((c) => c.competencyCategory === "soft_skill").length;
  const leadership = competencies.filter((c) => c.competencyCategory === "leadership").length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb items={[
        {
                label: "Gestión de Talento",
                href: "/"
        },
        {
                label: "Catálogo de Competencias"
        }
]} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Competencias Organizacionales</h1>
          <p className="text-muted-foreground mt-1">
            Administra el catálogo de habilidades blandas, liderazgo y competencias transversales
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Competencia
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{totalCompetencies}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-muted-foreground">Activas</div>
          <div className="text-2xl font-bold text-green-600">{activeCompetencies}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-muted-foreground">Habilidades Blandas</div>
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
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
            onChange={(e) => setStatusFilter(e.target.value as any)}
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
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron competencias
                </TableCell>
              </TableRow>
            ) : (
              filteredCompetencies.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium">{comp.competencyName}</TableCell>
                  <TableCell>
                    <Badge className={categoryColors[comp.competencyCategory as CompetencyCategory]}>
                      {categoryLabels[comp.competencyCategory as CompetencyCategory]}
                    </Badge>
                  </TableCell>
                  <TableCell>{levelLabels[comp.requiredLevel as CompetencyLevel]}</TableCell>
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
                onChange={(e) => setFormData({ ...formData, competencyName: e.target.value })}
                placeholder="Ej: Comunicación Efectiva"
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  onChange={(e) =>
                    setFormData({ ...formData, competencyCategory: e.target.value as CompetencyCategory })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="soft_skill">Habilidad Blanda</option>
                  <option value="organizational">Organizacional</option>
                  <option value="leadership">Liderazgo</option>
                  <option value="technical_transversal">Técnica Transversal</option>
                </select>
              </div>
              <div>
                <Label htmlFor="requiredLevel">Nivel Requerido *</Label>
                <select
                  id="requiredLevel"
                  value={formData.requiredLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, requiredLevel: e.target.value as CompetencyLevel })
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
              <Label htmlFor="appliesToDepartments">Aplicable a Departamentos</Label>
              <Input
                id="appliesToDepartments"
                value={formData.appliesToDepartments}
                onChange={(e) =>
                  setFormData({ ...formData, appliesToDepartments: e.target.value })
                }
                placeholder="all (todos) o lista separada por comas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Escribe "all" para todos los departamentos o lista separada por comas
              </p>
            </div>
            <div>
              <Label htmlFor="appliesToRoles">Aplicable a Roles</Label>
              <Input
                id="appliesToRoles"
                value={formData.appliesToRoles}
                onChange={(e) => setFormData({ ...formData, appliesToRoles: e.target.value })}
                placeholder="all (todos) o lista separada por comas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Escribe "all" para todos los roles o lista separada por comas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear Competencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Competencia</DialogTitle>
            <DialogDescription>Actualiza la información de la competencia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre de la Competencia *</Label>
              <Input
                id="edit-name"
                value={formData.competencyName}
                onChange={(e) => setFormData({ ...formData, competencyName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Categoría *</Label>
                <select
                  id="edit-category"
                  value={formData.competencyCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, competencyCategory: e.target.value as CompetencyCategory })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="soft_skill">Habilidad Blanda</option>
                  <option value="organizational">Organizacional</option>
                  <option value="leadership">Liderazgo</option>
                  <option value="technical_transversal">Técnica Transversal</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-requiredLevel">Nivel Requerido *</Label>
                <select
                  id="edit-requiredLevel"
                  value={formData.requiredLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, requiredLevel: e.target.value as CompetencyLevel })
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
              <Label htmlFor="edit-appliesToDepartments">Aplicable a Departamentos</Label>
              <Input
                id="edit-appliesToDepartments"
                value={formData.appliesToDepartments}
                onChange={(e) =>
                  setFormData({ ...formData, appliesToDepartments: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-appliesToRoles">Aplicable a Roles</Label>
              <Input
                id="edit-appliesToRoles"
                value={formData.appliesToRoles}
                onChange={(e) => setFormData({ ...formData, appliesToRoles: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta competencia? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
