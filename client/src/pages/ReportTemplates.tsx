import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Eye, Star, Code } from "lucide-react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";

export default function ReportTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo: "verificacion_numerales",
    htmlTemplate: "",
    cssStyles: "",
    variables: "logo,razonSocial,rfc,folio,fecha",
    isDefault: false,
    activo: true,
  });

  const { data: templates, refetch } = trpc.reportTemplates.list.useQuery({});
  const createMutation = trpc.reportTemplates.create.useMutation();
  const updateMutation = trpc.reportTemplates.update.useMutation();
  const deleteMutation = trpc.reportTemplates.delete.useMutation();
  const setDefaultMutation = trpc.reportTemplates.setDefault.useMutation();

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      nombre: "",
      descripcion: "",
      tipo: "verificacion_numerales",
      htmlTemplate: "",
      cssStyles: "",
      variables: "logo,razonSocial,rfc,folio,fecha",
      isDefault: false,
      activo: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      nombre: template.nombre,
      descripcion: template.descripcion || "",
      tipo: template.tipo,
      htmlTemplate: template.htmlTemplate,
      cssStyles: template.cssStyles || "",
      variables: template.variables || "",
      isDefault: template.isDefault,
      activo: template.activo,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedTemplate) {
        await updateMutation.mutateAsync({
          id: selectedTemplate.id,
          ...formData,
        });
        toast.success("Plantilla actualizada exitosamente");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Plantilla creada exitosamente");
      }
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar plantilla");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta plantilla?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Plantilla eliminada exitosamente");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar plantilla");
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultMutation.mutateAsync({ id });
      toast.success("Plantilla establecida como default");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al establecer como default");
    }
  };

  const handlePreview = (template: any) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const getPreviewHTML = () => {
    if (!selectedTemplate) return "";
    
    // Reemplazar variables con datos de ejemplo
    let html = selectedTemplate.htmlTemplate;
    const variables = {
      logo: "https://via.placeholder.com/150x50?text=LOGO",
      razonSocial: "EMPRESA EJEMPLO S.A. DE C.V.",
      rfc: "EEJ010101ABC",
      folio: "VN-001/2026",
      fecha: new Date().toLocaleDateString("es-MX"),
      titulo: "Reporte de Verificación de Numerales NOM-035",
      contenido: "<p>Contenido de ejemplo del reporte...</p>",
    };

    Object.entries(variables).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{${key}}`, "g"), value);
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>${selectedTemplate.cssStyles || ""}</style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plantillas de Reportes</h1>
          <p className="text-muted-foreground">
            Gestiona las plantillas personalizables para documentos oficiales
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Variables disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Code className="w-5 h-5" />
            Variables Disponibles
          </CardTitle>
          <CardDescription>
            Usa estas variables en tus plantillas HTML para insertar datos dinámicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["logo", "razonSocial", "rfc", "folio", "fecha", "titulo", "contenido"].map((variable) => (
              <Badge key={variable} variant="secondary" className="font-mono">
                {`{${variable}}`}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {template.nombre}
                    {template.isDefault && (
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {template.descripcion || "Sin descripción"}
                  </CardDescription>
                </div>
                <Badge variant={template.activo ? "default" : "secondary"}>
                  {template.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Tipo:</span> {template.tipo}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreview(template)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Vista Previa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  {!template.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(template.id)}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de creación/edición */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Editar Plantilla" : "Nueva Plantilla"}
            </DialogTitle>
            <DialogDescription>
              Crea o edita plantillas HTML/CSS para documentos oficiales
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Formulario */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Plantilla de Verificación"
                />
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción de la plantilla"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verificacion_numerales">Verificación de Numerales</SelectItem>
                    <SelectItem value="minuta">Minuta</SelectItem>
                    <SelectItem value="constancia">Constancia</SelectItem>
                    <SelectItem value="reporte_general">Reporte General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="variables">Variables (separadas por coma)</Label>
                <Input
                  id="variables"
                  value={formData.variables}
                  onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                  placeholder="logo,razonSocial,rfc,folio,fecha"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                <Label htmlFor="isDefault">Establecer como plantilla por defecto</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label htmlFor="activo">Activo</Label>
              </div>
            </div>

            {/* Editor de código */}
            <div className="space-y-4">
              <div>
                <Label>HTML Template</Label>
                <div className="border rounded-md overflow-hidden">
                  <Editor
                    height="300px"
                    language="html"
                    value={formData.htmlTemplate}
                    onChange={(value) => setFormData({ ...formData, htmlTemplate: value || "" })}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>

              <div>
                <Label>CSS Styles</Label>
                <div className="border rounded-md overflow-hidden">
                  <Editor
                    height="200px"
                    language="css"
                    value={formData.cssStyles}
                    onChange={(value) => setFormData({ ...formData, cssStyles: value || "" })}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar Plantilla
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de vista previa */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa - {selectedTemplate?.nombre}</DialogTitle>
            <DialogDescription>
              Visualización con datos de ejemplo
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-md overflow-auto" style={{ height: "70vh" }}>
            <iframe
              srcDoc={getPreviewHTML()}
              className="w-full h-full"
              title="Vista Previa"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
