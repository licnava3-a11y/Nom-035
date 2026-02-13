import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProtectedButton from "@/components/ProtectedButton";
import { Button } from "@/components/ui/button";
import { Shield, Users, Check, X, Search, Edit, FileDown, FileText } from "lucide-react";
import { toast } from "sonner";

export default function RolesPermissions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>("");

  const utils = trpc.useUtils();

  // Fetch roles and permissions matrix
  const { data: roles = [], isLoading: rolesLoading } = trpc.rolesPermissions.getAllRoles.useQuery();

  // Fetch users with pagination
  const { data: usersData, isLoading: usersLoading } = trpc.rolesPermissions.getUsersByRole.useQuery({
    role: selectedRole === "all" ? undefined : selectedRole,
    search: searchTerm || undefined,
    page,
    limit: 20,
  });

  // Fetch role distribution for stats
  const { data: distribution = [], isLoading: distributionLoading } = trpc.rolesPermissions.getRoleDistribution.useQuery();

  // Update user role mutation
  const updateRoleMutation = trpc.rolesPermissions.updateUserRole.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.rolesPermissions.getUsersByRole.invalidate();
      utils.rolesPermissions.getRoleDistribution.invalidate();
      utils.rolesPermissions.getAllRoles.invalidate();
      setEditDialogOpen(false);
      setSelectedUser(null);
      setNewRole("");
    },
    onError: (error) => {
      toast.error(error.message || "Error al cambiar rol");
    },
  });

  const handleEditRole = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setEditDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!selectedUser || !newRole) return;
    updateRoleMutation.mutate({
      userId: selectedUser.id,
      newRole: newRole as any,
    });
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      admin: "Administrador",
      gerente: "Gerente",
      director: "Director",
      instructor: "Instructor",
      administrativo: "Administrativo",
      recursos_humanos: "Recursos Humanos",
      rh: "RH",
      auxiliar_rh: "Auxiliar RH",
      committee: "Comité",
      committee_coordinator: "Coordinador de Comité",
      committee_member: "Miembro de Comité",
      responsable_nom035: "Responsable NOM-035",
      supervisor: "Supervisor",
      jefe_area: "Jefe de Área",
      empleado: "Empleado",
      student: "Estudiante",
      demo: "Demo",
    };
    return roleNames[role] || role;
  };

  const getPermissionBadge = (hasPermission: boolean) => {
    return hasPermission ? (
      <Badge variant="default" className="bg-green-600">
        <Check className="h-3 w-3" />
      </Badge>
    ) : (
      <Badge variant="secondary">
        <X className="h-3 w-3" />
      </Badge>
    );
  };

  const exportToExcel = () => {
    const permissionLabels: Record<string, string> = {
      can_view: "Ver",
      can_create: "Crear",
      can_edit: "Editar",
      can_delete: "Eliminar",
      can_approve: "Aprobar",
      can_export: "Exportar",
    };

    let csv = "Rol," + Object.values(permissionLabels).join(",") + "\n";

    roles.forEach((role) => {
      const row = [
        getRoleName(role.role),
        role.permissions.can_view ? "Sí" : "No",
        role.permissions.can_create ? "Sí" : "No",
        role.permissions.can_edit ? "Sí" : "No",
        role.permissions.can_delete ? "Sí" : "No",
        role.permissions.can_approve ? "Sí" : "No",
        role.permissions.can_export ? "Sí" : "No",
      ];
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `matriz-permisos-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Matriz de permisos exportada a Excel");
  };

  const exportToPDF = () => {
    window.print();
    toast.success("Abriendo ventana de impresión para guardar como PDF");
  };

  if (rolesLoading || distributionLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando roles y permisos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Administración de Roles y Permisos</h1>
          <p className="text-muted-foreground">
            Gestiona los roles de usuario y visualiza la matriz de permisos del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <ProtectedButton
            requiredPermission="can_export"
            hideIfNoPermission
            variant="outline"
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={() => exportToExcel()}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Excel
          </ProtectedButton>
          <ProtectedButton
            requiredPermission="can_export"
            hideIfNoPermission
            variant="outline"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => exportToPDF()}
          >
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </ProtectedButton>
        </div>
      </div>

      {/* Role Distribution Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {distribution.slice(0, 5).map((item) => (
          <Card key={item.role}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {getRoleName(item.role)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{item.count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Matriz de Permisos por Rol
          </CardTitle>
          <CardDescription>
            Visualización de los permisos asignados a cada rol del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Rol</TableHead>
                  <TableHead className="text-center">Ver</TableHead>
                  <TableHead className="text-center">Crear</TableHead>
                  <TableHead className="text-center">Editar</TableHead>
                  <TableHead className="text-center">Eliminar</TableHead>
                  <TableHead className="text-center">Aprobar</TableHead>
                  <TableHead className="text-center">Exportar</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.role}>
                    <TableCell className="font-medium">
                      {getRoleName(role.role)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPermissionBadge(role.permissions.can_view)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPermissionBadge(role.permissions.can_create)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPermissionBadge(role.permissions.can_edit)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPermissionBadge(role.permissions.can_delete)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPermissionBadge(role.permissions.can_approve)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPermissionBadge(role.permissions.can_export)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{role.userCount}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Usuarios
          </CardTitle>
          <CardDescription>
            Cambia el rol asignado a cada usuario del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar usuario</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nombre o correo electrónico..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-[200px]">
              <Label htmlFor="roleFilter">Filtrar por rol</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => {
                  setSelectedRole(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="roleFilter">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.role} value={role.role}>
                      {getRoleName(role.role)} ({role.userCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
              </div>
            </div>
          ) : usersData && usersData.users.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Rol Actual</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name || "Sin nombre"}</TableCell>
                        <TableCell>{user.email || "Sin correo"}</TableCell>
                        <TableCell>{user.departamento || "-"}</TableCell>
                        <TableCell>{user.puesto || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoleName(user.role)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <ProtectedButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(user)}
                            requiredPermission="can_edit"
                            fallbackMessage="No tienes permisos para cambiar roles de usuario"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Cambiar Rol
                          </ProtectedButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * 20 + 1} a {Math.min(page * 20, usersData.totalCount)} de{" "}
                  {usersData.totalCount} usuarios
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(usersData.totalPages, p + 1))}
                    disabled={page === usersData.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No se encontraron usuarios</p>
              <p className="text-sm text-muted-foreground">
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo rol para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentRole">Rol Actual</Label>
              <Input
                id="currentRole"
                value={selectedUser ? getRoleName(selectedUser.role) : ""}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRole">Nuevo Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="newRole">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.role} value={role.role}>
                      {getRoleName(role.role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={!newRole || newRole === selectedUser?.role || updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
