import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Edit, Trash2, Download, Eye } from "lucide-react";

export default function CommitteeMinutesManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published'>('all');

  // Form state
  const [formData, setFormData] = useState({
    numeroSesion: "",
    tipoReunion: "",
    fecha: "",
    hora: "",
    lugar: "",
    desarrollo: "",
    observaciones: "",
    status: "draft" as 'draft' | 'published',
  });

  // Queries
  const { data: minutesData, refetch } = trpc.committeeMinutes.list.useQuery({
    status: filterStatus,
  });

  // Mutations
  const createMutation = trpc.committeeMinutes.create.useMutation({
    onSuccess: () => {
      alert('Minuta creada exitosamente');
      refetch();
      resetForm();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.committeeMinutes.update.useMutation({
    onSuccess: () => {
      alert('Minuta actualizada exitosamente');
      refetch();
      resetForm();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.committeeMinutes.delete.useMutation({
    onSuccess: () => {
      alert('Minuta eliminada exitosamente');
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const publishMutation = trpc.committeeMinutes.publish.useMutation({
    onSuccess: () => {
      alert('Minuta publicada exitosamente');
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const generatePDFMutation = trpc.compliance.generateCommitteeMinutesPDF.useMutation({
    onSuccess: (data) => {
      // Convertir base64 a blob y descargar
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Minuta_Comite_${data.data.folio}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      alert('PDF generado exitosamente');
    },
    onError: (error) => {
      alert(`Error al generar PDF: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      numeroSesion: "",
      tipoReunion: "",
      fecha: "",
      hora: "",
      lugar: "",
      desarrollo: "",
      observaciones: "",
      status: "draft",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (minute: any) => {
    setFormData({
      numeroSesion: minute.numeroSesion,
      tipoReunion: minute.tipoReunion,
      fecha: minute.fecha,
      hora: minute.hora,
      lugar: minute.lugar,
      desarrollo: minute.desarrollo || "",
      observaciones: minute.observaciones || "",
      status: minute.status,
    });
    setEditingId(minute.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar esta minuta?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePublish = (id: number) => {
    if (confirm('¿Está seguro de publicar esta minuta? No podrá revertirse a borrador.')) {
      publishMutation.mutate({ id });
    }
  };

  const handleGeneratePDF = (id: number) => {
    generatePDFMutation.mutate({ minuteId: id });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Minutas de Comité</h1>
          <p className="text-muted-foreground mt-2">
            Administración completa de minutas de reuniones del Comité NOM-035
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancelar' : 'Nueva Minuta'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Minuta' : 'Nueva Minuta'}</CardTitle>
            <CardDescription>
              Complete los datos de la minuta de reunión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numeroSesion">Número de Sesión *</Label>
                  <Input
                    id="numeroSesion"
                    value={formData.numeroSesion}
                    onChange={(e) => setFormData({ ...formData, numeroSesion: e.target.value })}
                    placeholder="S-001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipoReunion">Tipo de Reunión *</Label>
                  <Input
                    id="tipoReunion"
                    value={formData.tipoReunion}
                    onChange={(e) => setFormData({ ...formData, tipoReunion: e.target.value })}
                    placeholder="Reunión Ordinaria"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hora">Hora *</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="lugar">Lugar *</Label>
                <Input
                  id="lugar"
                  value={formData.lugar}
                  onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                  placeholder="Sala de Juntas Principal"
                  required
                />
              </div>

              <div>
                <Label htmlFor="desarrollo">Desarrollo de la Reunión</Label>
                <Textarea
                  id="desarrollo"
                  value={formData.desarrollo}
                  onChange={(e) => setFormData({ ...formData, desarrollo: e.target.value })}
                  placeholder="Descripción del desarrollo de la reunión..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="status">Estado</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                  className="w-full p-2 border rounded"
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? 'Actualizar' : 'Crear'} Minuta
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Minutas Registradas</CardTitle>
              <CardDescription>
                {minutesData?.total || 0} minutas encontradas
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Todas
              </Button>
              <Button
                variant={filterStatus === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('draft')}
              >
                Borradores
              </Button>
              <Button
                variant={filterStatus === 'published' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('published')}
              >
                Publicadas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Sesión</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Lugar</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-left p-2">Creado por</th>
                  <th className="text-right p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {minutesData?.minutes.map((minute: any) => (
                  <tr key={minute.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{minute.numeroSesion}</td>
                    <td className="p-2">{minute.tipoReunion}</td>
                    <td className="p-2">{minute.fecha}</td>
                    <td className="p-2">{minute.lugar}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        minute.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {minute.status === 'published' ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">{minute.createdByName}</td>
                    <td className="p-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(minute)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {minute.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePublish(minute.id)}
                            title="Publicar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGeneratePDF(minute.id)}
                          title="Generar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(minute.id)}
                          title="Eliminar"
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!minutesData?.minutes || minutesData.minutes.length === 0) && (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay minutas registradas</p>
                      <p className="text-sm">Cree una nueva minuta para comenzar</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
