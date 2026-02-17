import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  Users, 
  TrendingUp, 
  Award, 
  XCircle, 
  CheckCircle,
  Edit,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SalesPeopleManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Estados para modal de creación/edición
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSalesperson, setEditingSalesperson] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
  });

  // Queries
  const { data: distributionStats, isLoading } = trpc.salespeople.getDistributionStats.useQuery();

  // Mutations
  const createMutation = trpc.salespeople.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Vendedor creado",
        description: "El vendedor ha sido agregado exitosamente al sistema.",
      });
      setIsCreateModalOpen(false);
      setFormData({ nombre: "", email: "" });
      utils.salespeople.getDistributionStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = trpc.salespeople.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Vendedor actualizado",
        description: "Los datos del vendedor han sido actualizados.",
      });
      setIsEditModalOpen(false);
      setEditingSalesperson(null);
      utils.salespeople.getDistributionStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = trpc.salespeople.toggleActive.useMutation({
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado del vendedor ha sido actualizado.",
      });
      utils.salespeople.getDistributionStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreate = () => {
    if (!formData.nombre || !formData.email) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (salesperson: any) => {
    setEditingSalesperson(salesperson);
    setFormData({
      nombre: salesperson.nombre,
      email: salesperson.email,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    if (!editingSalesperson) return;
    updateMutation.mutate({
      id: editingSalesperson.id,
      ...formData,
    });
  };

  const handleToggleActive = (id: number) => {
    toggleActiveMutation.mutate({ id });
  };

  // Calcular estadísticas generales
  const totalSalespeople = distributionStats?.length || 0;
  const activeSalespeople = distributionStats?.filter((s) => s.activo).length || 0;
  const totalLeadsAssigned = distributionStats?.reduce((sum, s) => sum + (s.totalLeadsAsignados || 0), 0) || 0;
  const totalLeadsWon = distributionStats?.reduce((sum, s) => sum + (s.leadsGanados || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Vendedores</h1>
          <p className="text-muted-foreground mt-1">
            Administra tu equipo de ventas y monitorea la distribución de leads
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Agregar Vendedor
        </Button>
      </div>

      {/* Cards de estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSalespeople}</div>
            <p className="text-xs text-muted-foreground">
              {activeSalespeople} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Asignados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeadsAssigned}</div>
            <p className="text-xs text-muted-foreground">
              Total distribuidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Ganados</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeadsWon}</div>
            <p className="text-xs text-muted-foreground">
              Cerrados exitosamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLeadsAssigned > 0 
                ? `${((totalLeadsWon / totalLeadsAssigned) * 100).toFixed(1)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio del equipo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de vendedores */}
      <Card>
        <CardHeader>
          <CardTitle>Equipo de Ventas</CardTitle>
          <CardDescription>
            Distribución de leads y rendimiento por vendedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Leads Asignados</TableHead>
                <TableHead className="text-right">Activos</TableHead>
                <TableHead className="text-right">Ganados</TableHead>
                <TableHead className="text-right">Perdidos</TableHead>
                <TableHead className="text-right">Tasa Conversión</TableHead>
                <TableHead>Última Asignación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributionStats?.map((salesperson) => {
                const conversionRate = salesperson.totalLeadsAsignados > 0
                  ? ((salesperson.leadsGanados / salesperson.totalLeadsAsignados) * 100).toFixed(1)
                  : "0.0";

                return (
                  <TableRow key={salesperson.id}>
                    <TableCell className="font-medium">{salesperson.nombre}</TableCell>
                    <TableCell>{salesperson.email}</TableCell>
                    <TableCell>
                      {salesperson.activo ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {salesperson.totalLeadsAsignados}
                    </TableCell>
                    <TableCell className="text-right">
                      {salesperson.leadsActivos}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {salesperson.leadsGanados}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {salesperson.leadsPerdidos}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {conversionRate}%
                    </TableCell>
                    <TableCell>
                      {salesperson.ultimaAsignacion
                        ? format(new Date(salesperson.ultimaAsignacion), "dd/MM/yyyy HH:mm", { locale: es })
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/salesperson-performance")}
                          title="Ver rendimiento detallado"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(salesperson)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(salesperson.id)}
                        >
                          {salesperson.activo ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {distributionStats?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No hay vendedores registrados. Agrega tu primer vendedor para comenzar.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de creación */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Vendedor</DialogTitle>
            <DialogDescription>
              Completa los datos del vendedor para agregarlo al equipo de ventas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Carlos Martínez"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="carlos.martinez@empresa.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear Vendedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Vendedor</DialogTitle>
            <DialogDescription>
              Actualiza los datos del vendedor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nombre">Nombre Completo *</Label>
              <Input
                id="edit-nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Carlos Martínez"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="carlos.martinez@empresa.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
