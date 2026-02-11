import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Send, RefreshCw, Mail, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function NotificationsDashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    body: '',
    type: 'email' as 'email' | 'sms' | 'both',
    category: 'general' as 'certificate_expiry' | 'training_reminder' | 'course_available' | 'exam_reminder' | 'general',
  });

  // Queries
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = trpc.notifications.listTemplates.useQuery({
    category: selectedCategory as any,
  });
  const { data: stats } = trpc.notifications.getNotificationStats.useQuery();
  const { data: logsData, refetch: refetchLogs } = trpc.notifications.getNotificationLogs.useQuery({
    limit: 20,
    offset: 0,
  });

  // Mutations
  const createMutation = trpc.notifications.createTemplate.useMutation({
    onSuccess: () => {
      refetchTemplates();
      setIsCreateDialogOpen(false);
      resetForm();
      console.log('Plantilla creada exitosamente');
    },
  });

  const deleteMutation = trpc.notifications.deleteTemplate.useMutation({
    onSuccess: () => {
      refetchTemplates();
      console.log('Plantilla eliminada exitosamente');
    },
  });

  const retryMutation = trpc.notifications.retryNotification.useMutation({
    onSuccess: () => {
      refetchLogs();
      console.log('Notificación reenviada exitosamente');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      subject: '',
      body: '',
      type: 'email',
      category: 'general',
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar esta plantilla?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleRetry = (logId: number) => {
    retryMutation.mutate({ logId });
  };

  const getCategoryBadge = (category: string) => {
    const labels: Record<string, string> = {
      certificate_expiry: 'Expiración de certificados',
      training_reminder: 'Recordatorio de capacitación',
      course_available: 'Curso disponible',
      exam_reminder: 'Recordatorio de examen',
      general: 'General',
    };
    return <Badge variant="outline">{labels[category] || category}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Enviado
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Fallido
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Notificaciones</h1>
          <p className="text-muted-foreground">Gestión de plantillas y envío de notificaciones automáticas</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Enviadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats?.totalSent || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fallidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold">{stats?.totalFailed || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimas 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{stats?.last24h || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimos 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{stats?.last30days || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>

        {/* Tab de Plantillas */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de Notificación</CardTitle>
              <CardDescription>Gestione las plantillas de correo y SMS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Filtrar por categoría</Label>
                <Select
                  value={selectedCategory || 'all'}
                  onValueChange={(value) => setSelectedCategory(value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    <SelectItem value="certificate_expiry">Expiración de certificados</SelectItem>
                    <SelectItem value="training_reminder">Recordatorio de capacitación</SelectItem>
                    <SelectItem value="course_available">Curso disponible</SelectItem>
                    <SelectItem value="exam_reminder">Recordatorio de examen</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {templates && templates.length > 0 ? (
                  templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              {getCategoryBadge(template.category)}
                              {template.type === 'email' && <Mail className="h-4 w-4 text-blue-500" />}
                              {template.type === 'sms' && <MessageSquare className="h-4 w-4 text-green-500" />}
                              {template.type === 'both' && (
                                <>
                                  <Mail className="h-4 w-4 text-blue-500" />
                                  <MessageSquare className="h-4 w-4 text-green-500" />
                                </>
                              )}
                              {!template.isActive && <Badge variant="secondary">Inactiva</Badge>}
                            </div>
                            <CardDescription>{template.description || 'Sin descripción'}</CardDescription>
                            <p className="text-sm mt-2">
                              <strong>Asunto:</strong> {template.subject}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay plantillas disponibles</p>
                    <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear primera plantilla
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Historial */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Envíos</CardTitle>
              <CardDescription>Registro de todas las notificaciones enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logsData && logsData.logs.length > 0 ? (
                  logsData.logs.map((log) => (
                    <Card key={log.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(log.status)}
                              <span className="text-sm text-muted-foreground">
                                {log.templateName || 'Plantilla eliminada'}
                              </span>
                            </div>
                            <CardTitle className="text-lg">{log.subject}</CardTitle>
                            <CardDescription>
                              Para: {log.recipientEmail}
                              {log.recipientPhone && ` | Tel: ${log.recipientPhone}`}
                            </CardDescription>
                            <p className="text-sm text-muted-foreground mt-2">
                              {log.sentAt
                                ? `Enviado: ${new Date(log.sentAt).toLocaleString()}`
                                : `Creado: ${new Date(log.createdAt).toLocaleString()}`}
                            </p>
                            {log.error && (
                              <p className="text-sm text-red-500 mt-2">
                                <strong>Error:</strong> {log.error}
                              </p>
                            )}
                          </div>
                          {log.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(log.id)}
                              disabled={retryMutation.isPending}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reintentar
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay notificaciones en el historial</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Configuración */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Alertas Automáticas</CardTitle>
              <CardDescription>Configure los umbrales y frecuencias de las alertas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Alerta de expiración de certificados</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 días antes</SelectItem>
                    <SelectItem value="30">30 días antes</SelectItem>
                    <SelectItem value="60">60 días antes</SelectItem>
                    <SelectItem value="90">90 días antes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Se enviará una notificación automática cuando un certificado esté próximo a vencer
                </p>
              </div>

              <div>
                <Label>Recordatorios de capacitación</Label>
                <Select defaultValue="weekly">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Frecuencia de recordatorios para empleados con capacitación pendiente
                </p>
              </div>

              <div>
                <Label>Configuración SMTP</Label>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure las credenciales SMTP en las variables de entorno del servidor:
                  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
                </p>
              </div>

              <Button>
                <Send className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de creación */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Plantilla de Notificación</DialogTitle>
            <DialogDescription>
              Cree una plantilla reutilizable para envío de notificaciones
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Nombre de la plantilla *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Alerta de certificado próximo a vencer"
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción breve de la plantilla"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo de notificación</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Correo electrónico</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate_expiry">Expiración de certificados</SelectItem>
                    <SelectItem value="training_reminder">Recordatorio de capacitación</SelectItem>
                    <SelectItem value="course_available">Curso disponible</SelectItem>
                    <SelectItem value="exam_reminder">Recordatorio de examen</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Asunto *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Asunto del correo"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Use variables: {'{{nombre}}'}, {'{{curso}}'}, {'{{fecha}}'}
              </p>
            </div>

            <div>
              <Label htmlFor="body">Cuerpo del mensaje *</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Contenido del mensaje"
                rows={8}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Use variables: {'{{nombre}}'}, {'{{curso}}'}, {'{{fecha}}'}, {'{{enlace}}'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.subject || !formData.body || createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
