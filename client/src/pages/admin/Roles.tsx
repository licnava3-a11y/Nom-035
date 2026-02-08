/**
 * Página de Gestión de Roles y Permisos NOM-035
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, History, CheckCircle2, XCircle, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [changeRoleDialog, setChangeRoleDialog] = useState<{
    open: boolean;
    userId: number | null;
    currentRole: string | null;
    userName: string | null;
  }>({
    open: false,
    userId: null,
    currentRole: null,
    userName: null,
  });
  const [newRole, setNewRole] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Queries
  const { data: matrix, isLoading: matrixLoading } = trpc.roles.getRoleMatrix.useQuery();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.roles.getUsersByRole.useQuery({
    role: selectedRole as any,
  });
  const { data: auditLog, isLoading: auditLoading } = trpc.roles.getAuditLog.useQuery({
    limit: 50,
  });

  // Mutations
  const updateRoleMutation = trpc.roles.updateUserRole.useMutation({
    onSuccess: (data) => {
      toast.success('Rol actualizado', {
        description: data.message,
      });
      refetchUsers();
      setChangeRoleDialog({ open: false, userId: null, currentRole: null, userName: null });
      setNewRole('');
      setReason('');
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message,
      });
    },
  });

  const handleChangeRole = () => {
    if (!changeRoleDialog.userId || !newRole) {
      toast.error('Error: Selecciona un rol válido');
      return;
    }

    updateRoleMutation.mutate({
      userId: changeRoleDialog.userId,
      newRole: newRole as any,
      reason: reason || undefined,
    });
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case 'admin':
      case 'director':
        return 'destructive';
      case 'responsable_nom035':
        return 'default';
      case 'supervisor':
      case 'jefe_area':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const PermissionIcon = ({ allowed }: { allowed: boolean }) => (
    allowed ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-gray-300" />
    )
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestión de Roles y Permisos
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema de control de acceso basado en roles NOM-035
          </p>
        </div>
      </div>

      <Tabs defaultValue="matrix" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">
            <Shield className="h-4 w-4 mr-2" />
            Matriz de Permisos
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Gestión de Usuarios
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" />
            Historial de Cambios
          </TabsTrigger>
        </TabsList>

        {/* Tab: Matriz de Permisos */}
        <TabsContent value="matrix">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Matriz de Permisos por Rol</h3>
            {matrixLoading ? (
              <p className="text-muted-foreground">Cargando matriz...</p>
            ) : matrix ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Módulo</TableHead>
                      {matrix.roles.map((role) => (
                        <TableHead key={role.value} className="text-center">
                          <Badge variant={getRoleBadgeVariant(role.value)}>
                            {role.label}
                          </Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrix.modules.map((module) => (
                      <TableRow key={module.value}>
                        <TableCell className="font-medium">{module.label}</TableCell>
                        {matrix.roles.map((role) => {
                          const perms = matrix.matrix[role.value][module.value];
                          return (
                            <TableCell key={`${role.value}-${module.value}`} className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div title="Ver">
                                  <Eye className={`h-4 w-4 ${perms.canView ? 'text-green-600' : 'text-gray-300'}`} />
                                </div>
                                <div title="Crear">
                                  <Plus className={`h-4 w-4 ${perms.canCreate ? 'text-blue-600' : 'text-gray-300'}`} />
                                </div>
                                <div title="Editar">
                                  <Edit className={`h-4 w-4 ${perms.canEdit ? 'text-yellow-600' : 'text-gray-300'}`} />
                                </div>
                                <div title="Eliminar">
                                  <Trash2 className={`h-4 w-4 ${perms.canDelete ? 'text-red-600' : 'text-gray-300'}`} />
                                </div>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No se pudo cargar la matriz de permisos</p>
            )}
          </Card>
        </TabsContent>

        {/* Tab: Gestión de Usuarios */}
        <TabsContent value="users">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Usuarios por Rol</h3>
              <Select value={selectedRole || 'all'} onValueChange={(v) => setSelectedRole(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {matrix?.roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {usersLoading ? (
              <p className="text-muted-foreground">Cargando usuarios...</p>
            ) : users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || 'Sin nombre'}</TableCell>
                      <TableCell>{user.email || 'Sin email'}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.roleDisplayName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.lastSignedIn).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setChangeRoleDialog({
                              open: true,
                              userId: user.id,
                              currentRole: user.role,
                              userName: user.name,
                            });
                            setNewRole(user.role);
                          }}
                        >
                          Cambiar Rol
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No se encontraron usuarios</p>
            )}
          </Card>
        </TabsContent>

        {/* Tab: Historial de Cambios */}
        <TabsContent value="audit">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Historial de Cambios de Roles</h3>
            {auditLoading ? (
              <p className="text-muted-foreground">Cargando historial...</p>
            ) : auditLog && auditLog.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol Anterior</TableHead>
                    <TableHead>Rol Nuevo</TableHead>
                    <TableHead>Cambiado Por</TableHead>
                    <TableHead>Razón</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.createdAt).toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.oldRoleDisplay}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(log.newRole)}>
                          {log.newRoleDisplay}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.changedByName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.reason || 'Sin razón especificada'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No hay cambios registrados</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Cambiar Rol */}
      <Dialog open={changeRoleDialog.open} onOpenChange={(open) => {
        if (!open) {
          setChangeRoleDialog({ open: false, userId: null, currentRole: null, userName: null });
          setNewRole('');
          setReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
            <DialogDescription>
              Usuario: <strong>{changeRoleDialog.userName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-role">Nuevo Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="new-role">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {matrix?.roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Razón del cambio (opcional)</Label>
              <Input
                id="reason"
                placeholder="Ej: Promoción a supervisor"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangeRoleDialog({ open: false, userId: null, currentRole: null, userName: null });
                setNewRole('');
                setReason('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleChangeRole} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
