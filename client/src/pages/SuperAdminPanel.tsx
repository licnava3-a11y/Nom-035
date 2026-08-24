import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2,
  Users,
  BarChart3,
  Plus,
  Edit,
  Ban,
  CheckCircle,
  Search,
  Globe,
  Shield,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type PlanType = "trial" | "basic" | "professional" | "enterprise";
type StatusType = "active" | "suspended" | "cancelled";

const PLAN_LABELS: Record<PlanType, string> = {
  trial: "Prueba",
  basic: "Básico",
  professional: "Profesional",
  enterprise: "Empresarial",
};
const PLAN_COLORS: Record<PlanType, string> = {
  trial: "bg-gray-100 text-gray-700",
  basic: "bg-blue-100 text-blue-700",
  professional: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};
const STATUS_COLORS: Record<StatusType, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<StatusType, string> = {
  active: "Activa",
  suspended: "Suspendida",
  cancelled: "Cancelada",
};

// ─── Formulario de empresa ────────────────────────────────────────────────────
interface CompanyFormData {
  razonSocial: string;
  rfc: string;
  direccionFiscal: string;
  giro: string;
  representanteLegal: string;
  telefonoContacto: string;
  emailContacto: string;
  paginaWeb: string;
  plan: PlanType;
  conflictThreshold: number;
  notificationEmail: string;
  internalNotes: string;
}

const EMPTY_FORM: CompanyFormData = {
  razonSocial: "",
  rfc: "",
  direccionFiscal: "",
  giro: "",
  representanteLegal: "",
  telefonoContacto: "",
  emailContacto: "",
  paginaWeb: "",
  plan: "trial",
  conflictThreshold: 30,
  notificationEmail: "",
  internalNotes: "",
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SuperAdminPanel() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Estado de búsqueda y paginación
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusType>("all");
  const [planFilter, setPlanFilter] = useState<"all" | PlanType>("all");
  const [page, setPage] = useState(1);

  // Estado de diálogos
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(EMPTY_FORM);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null
  );
  const [userSearch, setUserSearch] = useState("");

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: stats } = trpc.superAdmin.getGlobalStats.useQuery();
  const { data: companiesData, isLoading } =
    trpc.superAdmin.listCompanies.useQuery({
      search: search || undefined,
      status: statusFilter,
      plan: planFilter,
      page,
      pageSize: 20,
    });
  const { data: companyUsers } = trpc.superAdmin.listCompanyUsers.useQuery(
    { companyId: selectedCompanyId!, pageSize: 50 },
    { enabled: selectedCompanyId !== null }
  );

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const createCompany = trpc.superAdmin.createCompany.useMutation({
    onSuccess: () => {
      toast.success("Empresa creada correctamente");
      utils.superAdmin.listCompanies.invalidate();
      utils.superAdmin.getGlobalStats.invalidate();
      setShowForm(false);
      setFormData(EMPTY_FORM);
    },
    onError: e => toast.error(`Error: ${e.message}`),
  });

  const updateCompany = trpc.superAdmin.updateCompany.useMutation({
    onSuccess: () => {
      toast.success("Empresa actualizada");
      utils.superAdmin.listCompanies.invalidate();
      setShowForm(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
    },
    onError: e => toast.error(`Error: ${e.message}`),
  });

  const setStatus = trpc.superAdmin.setCompanyStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success(
        vars.status === "active" ? "Empresa reactivada" : "Empresa suspendida"
      );
      utils.superAdmin.listCompanies.invalidate();
    },
    onError: e => toast.error(`Error: ${e.message}`),
  });

  const setUserRole = trpc.superAdmin.setUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rol actualizado");
      utils.superAdmin.listCompanyUsers.invalidate();
    },
    onError: e => toast.error(`Error: ${e.message}`),
  });

  // ─── Acceso restringido ──────────────────────────────────────────────────────
  if (user?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="w-16 h-16 text-red-400" />
        <h2 className="text-2xl font-bold text-red-600">Acceso Restringido</h2>
        <p className="text-muted-foreground">
          Esta sección es exclusiva del Super Administrador del sistema.
        </p>
      </div>
    );
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const handleOpenEdit = (
    company: NonNullable<typeof companiesData>["data"][0]
  ) => {
    setEditingId(company.id);
    setFormData({
      razonSocial: company.razonSocial,
      rfc: company.rfc,
      direccionFiscal: company.direccionFiscal ?? "",
      giro: company.giro ?? "",
      representanteLegal: company.representanteLegal ?? "",
      telefonoContacto: company.telefonoContacto ?? "",
      emailContacto: company.emailContacto ?? "",
      paginaWeb: company.paginaWeb ?? "",
      plan: company.plan as PlanType,
      conflictThreshold: Number(company.conflictThreshold ?? 30),
      notificationEmail: company.notificationEmail ?? "",
      internalNotes: company.internalNotes ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.razonSocial || !formData.rfc) {
      toast.error("Razón Social y RFC son obligatorios");
      return;
    }
    if (editingId) {
      updateCompany.mutate({ id: editingId, ...formData });
    } else {
      createCompany.mutate(formData);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" />
            Panel Super Administrador
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión global de empresas, usuarios y configuración del sistema
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Empresa
        </Button>
      </div>

      {/* Estadísticas globales */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalCompanies}</p>
                  <p className="text-xs text-muted-foreground">
                    Total Empresas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeCompanies}</p>
                  <p className="text-xs text-muted-foreground">Activas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">
                    Usuarios Totales
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-amber-500" />
                <div>
                  <div className="flex gap-1 flex-wrap">
                    {stats.planBreakdown.map(p => (
                      <span key={p.plan} className="text-xs">
                        {PLAN_LABELS[p.plan as PlanType]}: {p.count}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Por Plan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="w-4 h-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Usuarios por Empresa
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Sin Empresa
          </TabsTrigger>
        </TabsList>

        {/* Tab: Empresas */}
        <TabsContent value="companies" className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por razón social, RFC o correo..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={v => {
                setStatusFilter(v as "all" | StatusType);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="suspended">Suspendida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={planFilter}
              onValueChange={v => {
                setPlanFilter(v as "all" | PlanType);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los planes</SelectItem>
                <SelectItem value="trial">Prueba</SelectItem>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="professional">Profesional</SelectItem>
                <SelectItem value="enterprise">Empresarial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de empresas */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón Social</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Cargando empresas...
                    </TableCell>
                  </TableRow>
                ) : !companiesData?.data.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No se encontraron empresas
                    </TableCell>
                  </TableRow>
                ) : (
                  companiesData.data.map(company => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        {company.razonSocial}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {company.rfc}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${PLAN_COLORS[company.plan as PlanType]}`}
                        >
                          {PLAN_LABELS[company.plan as PlanType]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[company.status as StatusType]}`}
                        >
                          {STATUS_LABELS[company.status as StatusType]}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => setSelectedCompanyId(company.id)}
                          className="text-primary hover:underline font-medium"
                        >
                          {(company as any).userCount ?? 0}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(company.createdAt).toLocaleDateString(
                          "es-MX"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(company)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {company.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setStatus.mutate({
                                  id: company.id,
                                  status: "suspended",
                                })
                              }
                              title="Suspender"
                              className="text-yellow-600 hover:text-yellow-700"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setStatus.mutate({
                                  id: company.id,
                                  status: "active",
                                })
                              }
                              title="Reactivar"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {companiesData && companiesData.totalPages > 1 && (
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>
                Mostrando {(page - 1) * 20 + 1}–
                {Math.min(page * 20, companiesData.total)} de{" "}
                {companiesData.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= companiesData.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Usuarios por empresa */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-3 items-center">
            <Select
              value={selectedCompanyId?.toString() ?? ""}
              onValueChange={v => setSelectedCompanyId(Number(v))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Seleccionar empresa..." />
              </SelectTrigger>
              <SelectContent>
                {companiesData?.data.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.razonSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {selectedCompanyId ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead className="text-right">Cambiar Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!companyUsers?.data.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No hay usuarios en esta empresa
                      </TableCell>
                    </TableRow>
                  ) : (
                    companyUsers.data
                      .filter(
                        u =>
                          !userSearch ||
                          u.name
                            ?.toLowerCase()
                            .includes(userSearch.toLowerCase()) ||
                          u.email
                            ?.toLowerCase()
                            .includes(userSearch.toLowerCase())
                      )
                      .map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.email ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.lastSignedIn
                              ? new Date(u.lastSignedIn).toLocaleDateString(
                                  "es-MX"
                                )
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={u.role}
                              onValueChange={v =>
                                setUserRole.mutate({
                                  userId: u.id,
                                  role: v as any,
                                })
                              }
                            >
                              <SelectTrigger className="w-36 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[
                                  "super_admin",
                                  "admin",
                                  "director",
                                  "gerente",
                                  "rh",
                                  "supervisor",
                                  "jefe_area",
                                  "empleado",
                                  "instructor",
                                  "responsable_nom035",
                                ].map(r => (
                                  <SelectItem
                                    key={r}
                                    value={r}
                                    className="text-xs"
                                  >
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Selecciona una empresa para ver sus usuarios</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Usuarios sin empresa */}
        <TabsContent value="unassigned" className="space-y-4">
          <UnassignedUsersSection companiesData={companiesData?.data ?? []} />
        </TabsContent>
      </Tabs>

      {/* Diálogo: Crear / Editar empresa */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Empresa" : "Nueva Empresa"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Razón Social *</Label>
              <Input
                value={formData.razonSocial}
                onChange={e =>
                  setFormData(f => ({ ...f, razonSocial: e.target.value }))
                }
                placeholder="Empresa S.A. de C.V."
              />
            </div>
            <div className="space-y-1">
              <Label>RFC *</Label>
              <Input
                value={formData.rfc}
                onChange={e =>
                  setFormData(f => ({
                    ...f,
                    rfc: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="EMP000101ABC"
                maxLength={13}
              />
            </div>
            <div className="space-y-1">
              <Label>Giro</Label>
              <Input
                value={formData.giro}
                onChange={e =>
                  setFormData(f => ({ ...f, giro: e.target.value }))
                }
                placeholder="Manufactura / Servicios..."
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Dirección Fiscal</Label>
              <Textarea
                value={formData.direccionFiscal}
                onChange={e =>
                  setFormData(f => ({ ...f, direccionFiscal: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Representante Legal</Label>
              <Input
                value={formData.representanteLegal}
                onChange={e =>
                  setFormData(f => ({
                    ...f,
                    representanteLegal: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input
                value={formData.telefonoContacto}
                onChange={e =>
                  setFormData(f => ({ ...f, telefonoContacto: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Correo de Contacto</Label>
              <Input
                type="email"
                value={formData.emailContacto}
                onChange={e =>
                  setFormData(f => ({ ...f, emailContacto: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Página Web</Label>
              <Input
                value={formData.paginaWeb}
                onChange={e =>
                  setFormData(f => ({ ...f, paginaWeb: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <Label>Plan</Label>
              <Select
                value={formData.plan}
                onValueChange={v =>
                  setFormData(f => ({ ...f, plan: v as PlanType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Prueba (Trial)</SelectItem>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="professional">Profesional</SelectItem>
                  <SelectItem value="enterprise">Empresarial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Umbral de Conflicto (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={formData.conflictThreshold}
                onChange={e =>
                  setFormData(f => ({
                    ...f,
                    conflictThreshold: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Correo de Notificaciones</Label>
              <Input
                type="email"
                value={formData.notificationEmail}
                onChange={e =>
                  setFormData(f => ({
                    ...f,
                    notificationEmail: e.target.value,
                  }))
                }
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notas Internas (solo super_admin)</Label>
              <Textarea
                value={formData.internalNotes}
                onChange={e =>
                  setFormData(f => ({ ...f, internalNotes: e.target.value }))
                }
                rows={2}
                placeholder="Notas de seguimiento, acuerdos comerciales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createCompany.isPending || updateCompany.isPending}
            >
              {createCompany.isPending || updateCompany.isPending
                ? "Guardando..."
                : editingId
                  ? "Actualizar"
                  : "Crear Empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente: Usuarios sin empresa ─────────────────────────────────────────
function UnassignedUsersSection({
  companiesData,
}: {
  companiesData: Array<{ id: number; razonSocial: string }>;
}) {
  const utils = trpc.useUtils();
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<
    Record<number, string>
  >({});

  const { data: unassigned, isLoading } =
    trpc.superAdmin.listUnassignedUsers.useQuery();

  const assignUser = trpc.superAdmin.assignUserToCompany.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Usuario asignado correctamente");
      utils.superAdmin.listUnassignedUsers.invalidate();
      utils.superAdmin.getGlobalStats.invalidate();
      setAssigningId(null);
    },
    onError: e => toast.error(`Error: ${e.message}`),
  });

  const handleAssign = (userId: number) => {
    const companyId = selectedCompany[userId];
    if (!companyId) {
      toast.error("Selecciona una empresa primero");
      return;
    }
    assignUser.mutate({ userId, companyId: Number(companyId) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!unassigned?.length) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <UserCheck className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-70" />
        <p className="font-medium text-green-700">
          Todos los usuarios tienen empresa asignada
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          No hay usuarios sin empresa en el sistema
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
        <p className="text-sm text-yellow-800">
          <strong>{unassigned.length} usuario(s)</strong> no tienen empresa
          asignada. Asígnalos a una empresa para completar el aislamiento de
          tenant.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Asignar a empresa</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unassigned.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.email ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("es-MX")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={selectedCompany[u.id] ?? ""}
                    onValueChange={v =>
                      setSelectedCompany(prev => ({ ...prev, [u.id]: v }))
                    }
                  >
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue placeholder="Seleccionar empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companiesData.map(c => (
                        <SelectItem
                          key={c.id}
                          value={c.id.toString()}
                          className="text-xs"
                        >
                          {c.razonSocial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!selectedCompany[u.id] || assignUser.isPending}
                    onClick={() => handleAssign(u.id)}
                    className="gap-1"
                  >
                    <UserCheck className="w-3 h-3" />
                    Asignar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
