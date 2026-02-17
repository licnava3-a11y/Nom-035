import { useState, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Filter, Calendar, DollarSign, Building, User, Phone, Mail, AlertCircle } from "lucide-react";
import { LeadCard } from "@/components/LeadCard";
import { useToast } from "@/hooks/use-toast";

type LeadEstado = "nuevo" | "contactado" | "en_negociacion" | "propuesta_enviada" | "ganado" | "perdido";

const ESTADOS_CONFIG: Record<LeadEstado, { label: string; color: string; bgColor: string }> = {
  nuevo: { label: "Nuevo", color: "text-blue-600", bgColor: "bg-blue-50" },
  contactado: { label: "Contactado", color: "text-purple-600", bgColor: "bg-purple-50" },
  en_negociacion: { label: "En Negociación", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  propuesta_enviada: { label: "Propuesta Enviada", color: "text-orange-600", bgColor: "bg-orange-50" },
  ganado: { label: "Ganado", color: "text-green-600", bgColor: "bg-green-50" },
  perdido: { label: "Perdido", color: "text-red-600", bgColor: "bg-red-50" },
};

export default function LeadsPipeline() {
  const { toast } = useToast();
  const [filtroOrigen, setFiltroOrigen] = useState<string | undefined>();
  const [filtroNormativa, setFiltroNormativa] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Queries
  const { data: pipeline, refetch } = trpc.leads.getLeadsPipeline.useQuery({
    origen: filtroOrigen,
    normativa: filtroNormativa,
  });

  const { data: stats } = trpc.leads.getPipelineStats.useQuery();
  const { data: upcomingReminders } = trpc.leads.getUpcomingReminders.useQuery();

  // Mutations
  const updateStatusMutation = trpc.leads.updateLeadStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast({ title: "Lead actualizado", description: "El estado del lead se actualizó correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadMutation = trpc.leads.updateLead.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditModalOpen(false);
      toast({ title: "Lead actualizado", description: "La información del lead se actualizó correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createLeadMutation = trpc.leads.createLead.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateModalOpen(false);
      toast({ title: "Lead creado", description: "El lead se creó correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const leadId = active.id as number;
    const nuevoEstado = over.id as LeadEstado;

    // Actualizar estado del lead
    updateStatusMutation.mutate({ leadId, nuevoEstado });
    setActiveId(null);
  };

  const activeLead = useMemo(() => {
    if (!activeId || !pipeline) return null;
    
    for (const estado of Object.keys(pipeline)) {
      const lead = pipeline[estado as LeadEstado].find((l: any) => l.id === activeId);
      if (lead) return lead;
    }
    return null;
  }, [activeId, pipeline]);

  const handleEditLead = (lead: any) => {
    setSelectedLead(lead);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateLeadMutation.mutate({
      leadId: selectedLead.id,
      nombre: formData.get("nombre") as string,
      email: formData.get("email") as string || undefined,
      empresa: formData.get("empresa") as string || undefined,
      telefono: formData.get("telefono") as string || undefined,
      valorEstimado: formData.get("valorEstimado") ? Number(formData.get("valorEstimado")) : undefined,
      probabilidadCierre: formData.get("probabilidadCierre") ? Number(formData.get("probabilidadCierre")) : undefined,
      notas: formData.get("notas") as string || undefined,
    });
  };

  const handleCreateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createLeadMutation.mutate({
      nombre: formData.get("nombre") as string,
      email: formData.get("email") as string || undefined,
      empresa: formData.get("empresa") as string || undefined,
      telefono: formData.get("telefono") as string || undefined,
      valorEstimado: formData.get("valorEstimado") ? Number(formData.get("valorEstimado")) : undefined,
      origen: "manual",
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pipeline de Leads</h1>
          <p className="text-muted-foreground">Gestiona tus oportunidades de venta</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Lead
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Conversión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasaConversion.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Estimado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.valorTotalEstimado.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Ganado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${stats.valorGanado.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>Origen</Label>
            <Select value={filtroOrigen} onValueChange={setFiltroOrigen}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los orígenes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="landing_nom035">Landing NOM-035</SelectItem>
                <SelectItem value="landing_nom037">Landing NOM-037</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Normativa</Label>
            <Select value={filtroNormativa} onValueChange={setFiltroNormativa}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las normativas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="NOM-035">NOM-035</SelectItem>
                <SelectItem value="NOM-037">NOM-037</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFiltroOrigen(undefined);
                setFiltroNormativa(undefined);
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Próximas Acciones */}
      {upcomingReminders && upcomingReminders.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              Próximas Acciones (Próximas 24 horas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingReminders.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{lead.nombre}</p>
                    <p className="text-sm text-muted-foreground">{lead.proximaAccionDescripcion}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {lead.proximaAccion && new Date(lead.proximaAccion).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(ESTADOS_CONFIG).map(([estado, config]) => {
            const leads = pipeline?.[estado as LeadEstado] || [];
            
            return (
              <SortableContext key={estado} id={estado} items={leads.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                <Card className={config.bgColor}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`text-sm font-semibold ${config.color} flex items-center justify-between`}>
                      <span>{config.label}</span>
                      <Badge variant="secondary">{leads.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {leads.map((lead: any) => (
                      <LeadCard key={lead.id} lead={lead} onEdit={handleEditLead} />
                    ))}
                    {leads.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No hay leads en este estado
                      </div>
                    )}
                  </CardContent>
                </Card>
              </SortableContext>
            );
          })}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} onEdit={() => {}} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input id="nombre" name="nombre" defaultValue={selectedLead.nombre} required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={selectedLead.email || ""} />
                </div>
                <div>
                  <Label htmlFor="empresa">Empresa</Label>
                  <Input id="empresa" name="empresa" defaultValue={selectedLead.empresa || ""} />
                </div>
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" name="telefono" defaultValue={selectedLead.telefono || ""} />
                </div>
                <div>
                  <Label htmlFor="valorEstimado">Valor Estimado ($)</Label>
                  <Input id="valorEstimado" name="valorEstimado" type="number" defaultValue={selectedLead.valorEstimado || ""} />
                </div>
                <div>
                  <Label htmlFor="probabilidadCierre">Probabilidad de Cierre (%)</Label>
                  <Input id="probabilidadCierre" name="probabilidadCierre" type="number" min="0" max="100" defaultValue={selectedLead.probabilidadCierre || 0} />
                </div>
              </div>
              <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea id="notas" name="notas" rows={4} defaultValue={selectedLead.notas || ""} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar Cambios</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Creación */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-nombre">Nombre *</Label>
                <Input id="create-nombre" name="nombre" required />
              </div>
              <div>
                <Label htmlFor="create-email">Email</Label>
                <Input id="create-email" name="email" type="email" />
              </div>
              <div>
                <Label htmlFor="create-empresa">Empresa</Label>
                <Input id="create-empresa" name="empresa" />
              </div>
              <div>
                <Label htmlFor="create-telefono">Teléfono</Label>
                <Input id="create-telefono" name="telefono" />
              </div>
              <div>
                <Label htmlFor="create-valorEstimado">Valor Estimado ($)</Label>
                <Input id="create-valorEstimado" name="valorEstimado" type="number" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear Lead</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
