/**
 * Committee Annual Reports Management
 * Gestión de Reportes Anuales del Comité NOM-035
 */

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Edit, Trash2, Download, Eye, X, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title
);

interface Signature {
  name: string;
  position: string;
  signatureUrl?: string;
}

export default function CommitteeAnnualReports() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'final' | 'approved'>('all');
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    reportYear: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    executiveSummary: '',
    recommendations: '',
    actionPlan: '',
    status: 'draft' as 'draft' | 'final' | 'approved',
  });

  // Métricas
  const [metrics, setMetrics] = useState({
    totalMeetings: 0,
    averageAttendance: 0,
    casesHandled: 0,
    trainingsProvided: 0,
    complianceScore: 0,
  });

  // Actividades
  const [activities, setActivities] = useState<Array<{ description: string; date: string; impact: string }>>([
    { description: '', date: '', impact: '' }
  ]);

  // Capacitaciones
  const [trainings, setTrainings] = useState<Array<{ title: string; participants: number; date: string }>>([
    { title: '', participants: 0, date: '' }
  ]);

  // Casos atendidos
  const [cases, setCases] = useState<Array<{ category: string; count: number; resolution: string }>>([
    { category: '', count: 0, resolution: '' }
  ]);

  // Firmas
  const [signatures, setSignatures] = useState<Signature[]>([
    { name: '', position: '' }
  ]);

  // Queries
  const { data: reportsData, refetch } = trpc.committeeAnnualReports.list.useQuery({
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  // Mutations
  const createMutation = trpc.committeeAnnualReports.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Éxito', description: 'Reporte anual creado exitosamente' });
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = trpc.committeeAnnualReports.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Éxito', description: 'Reporte anual actualizado exitosamente' });
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = trpc.committeeAnnualReports.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Éxito', description: 'Reporte anual eliminado exitosamente' });
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const generatePDFMutation = trpc.committeeAnnualReports.generatePDF.useMutation({
    onSuccess: (data) => {
      toast({ title: 'Éxito', description: 'PDF generado exitosamente' });
      window.open(data.pdfUrl, '_blank');
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const publishMutation = trpc.committeeAnnualReports.publish.useMutation({
    onSuccess: () => {
      toast({ title: 'Éxito', description: 'Reporte publicado exitosamente' });
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Funciones auxiliares
  const resetForm = () => {
    setFormData({
      reportYear: new Date().getFullYear(),
      startDate: '',
      endDate: '',
      executiveSummary: '',
      recommendations: '',
      actionPlan: '',
      status: 'draft',
    });
    setMetrics({
      totalMeetings: 0,
      averageAttendance: 0,
      casesHandled: 0,
      trainingsProvided: 0,
      complianceScore: 0,
    });
    setActivities([{ description: '', date: '', impact: '' }]);
    setTrainings([{ title: '', participants: 0, date: '' }]);
    setCases([{ category: '', count: 0, resolution: '' }]);
    setSignatures([{ name: '', position: '' }]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      metrics: JSON.stringify(metrics),
      activities: JSON.stringify(activities.filter(a => a.description)),
      trainings: JSON.stringify(trainings.filter(t => t.title)),
      casesHandled: JSON.stringify(cases.filter(c => c.category)),
      complianceMetrics: JSON.stringify({ complianceScore: metrics.complianceScore }),
      signatures: JSON.stringify(signatures.filter(s => s.name)),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = async (id: number) => {
    const report = reportsData?.reports.find(r => r.id === id);
    if (!report) return;

    setFormData({
      reportYear: report.reportYear,
      startDate: new Date(report.startDate).toISOString().split('T')[0],
      endDate: new Date(report.endDate).toISOString().split('T')[0],
      executiveSummary: report.executiveSummary,
      recommendations: report.recommendations,
      actionPlan: report.actionPlan,
      status: report.status as 'draft' | 'final' | 'approved',
    });

    setMetrics(JSON.parse(report.metrics));
    setActivities(JSON.parse(report.activities));
    setTrainings(JSON.parse(report.trainings));
    setCases(JSON.parse(report.casesHandled));
    setSignatures(JSON.parse(report.signatures));

    setEditingId(id);
    setShowForm(true);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; year: number } | null>(null);

  const handleDelete = (id: number, year: number) => {
    setDeleteConfirm({ id, year });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate({ id: deleteConfirm.id });
      setDeleteConfirm(null);
    }
  };

  // Datos para gráficas
  const meetingsChartData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
      {
        label: 'Reuniones Realizadas',
        data: [2, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const casesChartData = {
    labels: cases.map(c => c.category || 'Sin categoría'),
    datasets: [
      {
        label: 'Casos Atendidos',
        data: cases.map(c => c.count),
        backgroundColor: [
          'rgba(239, 68, 68, 0.5)',
          'rgba(251, 191, 36, 0.5)',
          'rgba(34, 197, 94, 0.5)',
          'rgba(59, 130, 246, 0.5)',
          'rgba(168, 85, 247, 0.5)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const complianceChartData = {
    labels: ['Cumplimiento NOM-035'],
    datasets: [
      {
        label: 'Porcentaje de Cumplimiento',
        data: [metrics.complianceScore],
        backgroundColor: metrics.complianceScore >= 80 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(251, 191, 36, 0.5)',
        borderColor: metrics.complianceScore >= 80 ? 'rgba(34, 197, 94, 1)' : 'rgba(251, 191, 36, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reportes Anuales del Comité</h1>
          <p className="text-muted-foreground">Gestión de reportes anuales NOM-035</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Reporte
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Estado</Label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de reportes */}
      <Card>
        <CardHeader>
          <CardTitle>Reportes Anuales</CardTitle>
          <CardDescription>Total: {reportsData?.reports.length || 0} reportes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportsData?.reports.map((report: any) => (
              <Card key={report.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        Reporte Anual {report.reportYear}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {report.folioCode}-{String(report.folioNumber).padStart(3, '0')}/{report.folioYear}
                      </p>
                      <p className="text-sm mt-2">
                        Periodo: {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
                      </p>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          report.status === 'approved' ? 'bg-green-100 text-green-800' :
                          report.status === 'final' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {report.status === 'approved' ? 'Aprobado' :
                           report.status === 'final' ? 'Final' : 'Borrador'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generatePDFMutation.mutate({ id: report.id })}
                        disabled={generatePDFMutation.isPending}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(report.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {report.status === 'draft' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => publishMutation.mutate({ id: report.id })}
                            disabled={publishMutation.isPending}
                          >
                            Publicar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(report.id, report.year)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Formulario de creación/edición */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Reporte Anual' : 'Nuevo Reporte Anual'}
            </DialogTitle>
            <DialogDescription>
              Complete la información del reporte anual del comité
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Año del Reporte</Label>
                    <Input
                      type="number"
                      value={formData.reportYear}
                      onChange={(e) => setFormData({ ...formData, reportYear: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Fecha de Inicio</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Fecha de Fin</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Resumen Ejecutivo</Label>
                  <Textarea
                    value={formData.executiveSummary}
                    onChange={(e) => setFormData({ ...formData, executiveSummary: e.target.value })}
                    rows={4}
                    required
                    placeholder="Resumen de las actividades y logros del comité durante el año..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Métricas */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Métricas Clave</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMetricsDialog(true)}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Ver Gráficas
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Total de Reuniones</Label>
                    <Input
                      type="number"
                      value={metrics.totalMeetings}
                      onChange={(e) => setMetrics({ ...metrics, totalMeetings: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Asistencia Promedio (%)</Label>
                    <Input
                      type="number"
                      value={metrics.averageAttendance}
                      onChange={(e) => setMetrics({ ...metrics, averageAttendance: parseFloat(e.target.value) || 0 })}
                      step="0.1"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label>Casos Atendidos</Label>
                    <Input
                      type="number"
                      value={metrics.casesHandled}
                      onChange={(e) => setMetrics({ ...metrics, casesHandled: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Capacitaciones Impartidas</Label>
                    <Input
                      type="number"
                      value={metrics.trainingsProvided}
                      onChange={(e) => setMetrics({ ...metrics, trainingsProvided: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Cumplimiento NOM-035 (%)</Label>
                    <Input
                      type="number"
                      value={metrics.complianceScore}
                      onChange={(e) => setMetrics({ ...metrics, complianceScore: parseFloat(e.target.value) || 0 })}
                      step="0.1"
                      max="100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actividades */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Actividades Realizadas</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActivities([...activities, { description: '', date: '', impact: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Actividad
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <Label>Descripción</Label>
                      <Input
                        value={activity.description}
                        onChange={(e) => {
                          const newActivities = [...activities];
                          newActivities[index].description = e.target.value;
                          setActivities(newActivities);
                        }}
                        placeholder="Descripción de la actividad..."
                      />
                    </div>
                    <div className="col-span-3">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={activity.date}
                        onChange={(e) => {
                          const newActivities = [...activities];
                          newActivities[index].date = e.target.value;
                          setActivities(newActivities);
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label>Impacto</Label>
                      <Input
                        value={activity.impact}
                        onChange={(e) => {
                          const newActivities = [...activities];
                          newActivities[index].impact = e.target.value;
                          setActivities(newActivities);
                        }}
                        placeholder="Alto/Medio/Bajo"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActivities(activities.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Capacitaciones */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Capacitaciones Impartidas</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTrainings([...trainings, { title: '', participants: 0, date: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Capacitación
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {trainings.map((training, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <Label>Título</Label>
                      <Input
                        value={training.title}
                        onChange={(e) => {
                          const newTrainings = [...trainings];
                          newTrainings[index].title = e.target.value;
                          setTrainings(newTrainings);
                        }}
                        placeholder="Título de la capacitación..."
                      />
                    </div>
                    <div className="col-span-3">
                      <Label>Participantes</Label>
                      <Input
                        type="number"
                        value={training.participants}
                        onChange={(e) => {
                          const newTrainings = [...trainings];
                          newTrainings[index].participants = parseInt(e.target.value) || 0;
                          setTrainings(newTrainings);
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={training.date}
                        onChange={(e) => {
                          const newTrainings = [...trainings];
                          newTrainings[index].date = e.target.value;
                          setTrainings(newTrainings);
                        }}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrainings(trainings.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Casos Atendidos */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Casos Atendidos</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCases([...cases, { category: '', count: 0, resolution: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Categoría
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {cases.map((caseItem, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-4">
                      <Label>Categoría</Label>
                      <Input
                        value={caseItem.category}
                        onChange={(e) => {
                          const newCases = [...cases];
                          newCases[index].category = e.target.value;
                          setCases(newCases);
                        }}
                        placeholder="Ej: Acoso laboral, Estrés, etc."
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        value={caseItem.count}
                        onChange={(e) => {
                          const newCases = [...cases];
                          newCases[index].count = parseInt(e.target.value) || 0;
                          setCases(newCases);
                        }}
                      />
                    </div>
                    <div className="col-span-5">
                      <Label>Resolución</Label>
                      <Input
                        value={caseItem.resolution}
                        onChange={(e) => {
                          const newCases = [...cases];
                          newCases[index].resolution = e.target.value;
                          setCases(newCases);
                        }}
                        placeholder="Estado de resolución..."
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCases(cases.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recomendaciones y Plan de Acción */}
            <Card>
              <CardHeader>
                <CardTitle>Recomendaciones y Plan de Acción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Recomendaciones</Label>
                  <Textarea
                    value={formData.recommendations}
                    onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                    rows={4}
                    required
                    placeholder="Recomendaciones para el siguiente periodo..."
                  />
                </div>
                <div>
                  <Label>Plan de Acción</Label>
                  <Textarea
                    value={formData.actionPlan}
                    onChange={(e) => setFormData({ ...formData, actionPlan: e.target.value })}
                    rows={4}
                    required
                    placeholder="Plan de acción para el siguiente periodo..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Firmas */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Firmas de Miembros del Comité</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSignatures([...signatures, { name: '', position: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Firma
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {signatures.map((signature, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <Label>Nombre</Label>
                      <Input
                        value={signature.name}
                        onChange={(e) => {
                          const newSignatures = [...signatures];
                          newSignatures[index].name = e.target.value;
                          setSignatures(newSignatures);
                        }}
                        placeholder="Nombre completo..."
                      />
                    </div>
                    <div className="col-span-6">
                      <Label>Cargo</Label>
                      <Input
                        value={signature.position}
                        onChange={(e) => {
                          const newSignatures = [...signatures];
                          newSignatures[index].position = e.target.value;
                          setSignatures(newSignatures);
                        }}
                        placeholder="Cargo en el comité..."
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSignatures(signatures.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Estado */}
            <Card>
              <CardHeader>
                <CardTitle>Estado del Reporte</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Estado</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <LoadingButton
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Actualizar' : 'Crear'} Reporte
              </LoadingButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Métricas con Gráficas */}
      <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualización de Métricas</DialogTitle>
            <DialogDescription>
              Gráficas de tendencias y cumplimiento NOM-035
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reuniones por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <Bar data={meetingsChartData} options={{ responsive: true, maintainAspectRatio: true }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Casos Atendidos por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <Doughnut data={casesChartData} options={{ responsive: true, maintainAspectRatio: true }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cumplimiento NOM-035</CardTitle>
              </CardHeader>
              <CardContent>
                <Bar
                  data={complianceChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Eliminar Reporte Anual"
        description={`¿Estás seguro de eliminar el reporte anual del año ${deleteConfirm?.year}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
}
