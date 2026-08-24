import { LoadingButton } from "@/components/ui/loading-button";
/**
 * Página de Gestión de Permisos Personalizados
 *
 * Permite a los administradores asignar permisos específicos a usuarios individuales
 * que sobrescriben los permisos del rol base.
 */

import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import {
  Shield,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  FileDown,
  FileText,
} from "lucide-react";
import ProtectedButton from "../components/ProtectedButton";

interface CustomPermissions {
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_approve?: boolean;
  can_export?: boolean;
}

export default function CustomPermissions() {
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(
    undefined
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customPerms, setCustomPerms] = useState<CustomPermissions>({});

  // Query: Listar usuarios con permisos personalizados
  const {
    data: usersData,
    isLoading,
    refetch,
  } = trpc.customPermissions.getUsersWithCustomPermissions.useQuery();

  // Query: Obtener todos los usuarios (para selector)
  const { data: allUsersData } = trpc.rolesPermissions.getUsersByRole.useQuery({
    role: undefined,
    search: "",
    page: 1,
    limit: 1000,
  });

  // Mutation: Actualizar permisos personalizados
  const updateMutation =
    trpc.customPermissions.updateUserCustomPermissions.useMutation({
      onSuccess: () => {
        toast.success("Permisos personalizados actualizados correctamente");
        refetch();
        setEditDialogOpen(false);
      },
      onError: error => {
        toast.error(`Error: ${error.message}`);
      },
    });

  // Mutation: Resetear permisos personalizados
  const resetMutation =
    trpc.customPermissions.resetUserCustomPermissions.useMutation({
      onSuccess: () => {
        toast.success(
          "Permisos reseteados. El usuario ahora usa los permisos de su rol."
        );
        refetch();
      },
      onError: error => {
        toast.error(`Error: ${error.message}`);
      },
    });

  const handleEditPermissions = (
    userId: number,
    currentPerms: CustomPermissions | null
  ) => {
    setSelectedUserId(userId);
    setCustomPerms(currentPerms || {});
    setEditDialogOpen(true);
  };

  const handleSavePermissions = () => {
    if (!selectedUserId) return;

    // Si todos los permisos están sin definir, resetear a null
    const hasAnyPermission = Object.values(customPerms).some(
      v => v !== undefined
    );

    updateMutation.mutate({
      userId: selectedUserId,
      customPermissions: hasAnyPermission ? customPerms : null,
    });
  };

  const handleResetPermissions = (userId: number) => {
    if (
      confirm(
        "¿Estás seguro de resetear los permisos personalizados? El usuario volverá a usar los permisos de su rol."
      )
    ) {
      resetMutation.mutate({ userId });
    }
  };

  const togglePermission = (permission: keyof CustomPermissions) => {
    setCustomPerms(prev => {
      const currentValue = prev[permission];

      // Ciclo: undefined -> true -> false -> undefined
      if (currentValue === undefined) {
        return { ...prev, [permission]: true };
      } else if (currentValue === true) {
        return { ...prev, [permission]: false };
      } else {
        const newPerms = { ...prev };
        delete newPerms[permission];
        return newPerms;
      }
    });
  };

  const getPermissionBadge = (value: boolean | undefined) => {
    if (value === undefined) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-600">
          Rol
        </Badge>
      );
    } else if (value === true) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="w-3 h-3 mr-1" />
          Permitido
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Denegado
        </Badge>
      );
    }
  };

  const exportToExcel = () => {
    if (!usersData || usersData.users.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const permissionLabels: Record<string, string> = {
      can_view: "Ver",
      can_create: "Crear",
      can_edit: "Editar",
      can_delete: "Eliminar",
      can_approve: "Aprobar",
      can_export: "Exportar",
    };

    let csv =
      "Usuario,Email,Rol," + Object.values(permissionLabels).join(",") + "\n";

    usersData.users.forEach((user: any) => {
      const perms = user.customPermissions as CustomPermissions;
      const row = [
        user.name,
        user.email,
        user.role,
        perms?.can_view === undefined ? "Rol" : perms.can_view ? "Sí" : "No",
        perms?.can_create === undefined
          ? "Rol"
          : perms.can_create
            ? "Sí"
            : "No",
        perms?.can_edit === undefined ? "Rol" : perms.can_edit ? "Sí" : "No",
        perms?.can_delete === undefined
          ? "Rol"
          : perms.can_delete
            ? "Sí"
            : "No",
        perms?.can_approve === undefined
          ? "Rol"
          : perms.can_approve
            ? "Sí"
            : "No",
        perms?.can_export === undefined
          ? "Rol"
          : perms.can_export
            ? "Sí"
            : "No",
      ];
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `permisos-personalizados-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Permisos personalizados exportados a Excel");
  };

  const exportToPDF = () => {
    window.print();
    toast.success("Abriendo ventana de impresión para guardar como PDF");
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Permisos Personalizados
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona permisos específicos por usuario que sobrescriben los
            permisos del rol base
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

      {/* Sección 1: Usuarios con permisos personalizados */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios con Permisos Personalizados</CardTitle>
          <CardDescription>
            {usersData?.total || 0} usuarios tienen permisos personalizados
            activos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">
              Cargando...
            </p>
          ) : usersData?.users.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay usuarios con permisos personalizados.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Todos los usuarios están usando los permisos de su rol base.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol Base</TableHead>
                  <TableHead>Ver</TableHead>
                  <TableHead>Crear</TableHead>
                  <TableHead>Editar</TableHead>
                  <TableHead>Eliminar</TableHead>
                  <TableHead>Aprobar</TableHead>
                  <TableHead>Exportar</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData?.users.map((user: any) => {
                  const perms = user.customPermissions as CustomPermissions;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {getPermissionBadge(perms?.can_view)}
                      </TableCell>
                      <TableCell>
                        {getPermissionBadge(perms?.can_create)}
                      </TableCell>
                      <TableCell>
                        {getPermissionBadge(perms?.can_edit)}
                      </TableCell>
                      <TableCell>
                        {getPermissionBadge(perms?.can_delete)}
                      </TableCell>
                      <TableCell>
                        {getPermissionBadge(perms?.can_approve)}
                      </TableCell>
                      <TableCell>
                        {getPermissionBadge(perms?.can_export)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <ProtectedButton
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleEditPermissions(user.id, perms)
                            }
                            requiredPermission="can_edit"
                            hideIfNoPermission
                          >
                            <Settings className="w-4 h-4" />
                          </ProtectedButton>
                          <ProtectedButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetPermissions(user.id)}
                            requiredPermission="can_edit"
                            hideIfNoPermission
                          >
                            <RefreshCw className="w-4 h-4" />
                          </ProtectedButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sección 2: Selector de usuario para asignar permisos */}
      <Card>
        <CardHeader>
          <CardTitle>Asignar Permisos Personalizados</CardTitle>
          <CardDescription>
            Selecciona un usuario de la lista para asignarle permisos
            específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Seleccionar Usuario</label>
              <select
                className="w-full mt-2 p-2 border rounded-md"
                onChange={e => {
                  const userId = parseInt(e.target.value);
                  if (userId) {
                    const user = allUsersData?.users.find(u => u.id === userId);
                    if (user) {
                      handleEditPermissions(userId, null);
                    }
                  }
                }}
                value=""
              >
                <option value="">-- Selecciona un usuario --</option>
                {allUsersData?.users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email}) - {user.role}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-muted-foreground">
              Los permisos personalizados sobrescriben los permisos del rol
              base. Usa "Rol" para heredar el permiso del rol, "Permitido" para
              forzar acceso, o "Denegado" para bloquear.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de edición de permisos */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Permisos Personalizados</DialogTitle>
            <DialogDescription>
              Configura permisos específicos para este usuario. Haz clic en cada
              permiso para alternar entre: Rol (heredado) → Permitido →
              Denegado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {[
              {
                key: "can_view" as keyof CustomPermissions,
                label: "Ver (can_view)",
                description: "Permite ver contenido y páginas",
              },
              {
                key: "can_create" as keyof CustomPermissions,
                label: "Crear (can_create)",
                description: "Permite crear nuevos registros",
              },
              {
                key: "can_edit" as keyof CustomPermissions,
                label: "Editar (can_edit)",
                description: "Permite modificar registros existentes",
              },
              {
                key: "can_delete" as keyof CustomPermissions,
                label: "Eliminar (can_delete)",
                description: "Permite eliminar registros",
              },
              {
                key: "can_approve" as keyof CustomPermissions,
                label: "Aprobar (can_approve)",
                description: "Permite aprobar documentos y solicitudes",
              },
              {
                key: "can_export" as keyof CustomPermissions,
                label: "Exportar (can_export)",
                description: "Permite exportar datos a Excel/PDF",
              },
            ].map(({ key, label, description }) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => togglePermission(key)}
                  className="ml-4"
                >
                  {getPermissionBadge(customPerms[key])}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleSavePermissions}
              loading={updateMutation.isPending}
              loadingText="Guardando..."
            >
              Guardar Permisos
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
