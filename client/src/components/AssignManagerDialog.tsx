import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AssignManagerDialogProps {
  departmentId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignManagerDialog({
  departmentId,
  onClose,
  onSuccess,
}: AssignManagerDialogProps) {

  const [selectedManagerId, setSelectedManagerId] = useState<string>('');

  // Obtener departamento
  const { data: department, isLoading: deptLoading } = trpc.departments.getById.useQuery(
    { id: departmentId },
    { enabled: !!departmentId }
  );

  // Obtener lista de usuarios que pueden ser managers (admin, gerente)
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();

  // Mutation para actualizar manager
  const updateMutation = trpc.departments.update.useMutation({
    onSuccess: () => {
      toast.success(`Manager asignado correctamente al departamento ${department?.name}`);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'No se pudo asignar el manager');
    },
  });

  const handleAssign = () => {
    if (!selectedManagerId || !department) return;

    updateMutation.mutate({
      id: departmentId,
      name: department.name,
      managerId: parseInt(selectedManagerId),
    });
  };

  const potentialManagers = users?.filter(
    (u) => u.role === 'admin' || u.role === 'gerente' || u.role === 'committee_coordinator'
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Manager</DialogTitle>
          <DialogDescription>
            Selecciona un responsable para el departamento{' '}
            <strong>{department?.name || 'Cargando...'}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {deptLoading || usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="manager">Manager / Responsable</Label>
                <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                  <SelectTrigger id="manager">
                    <SelectValue placeholder="Selecciona un manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialManagers?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {potentialManagers && potentialManagers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay usuarios con rol de gerente o administrador disponibles.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedManagerId || updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar Manager
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
