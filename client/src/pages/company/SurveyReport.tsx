import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, FileText, Calendar, Building2, Target, ClipboardList } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function SurveyReport() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };

  const { data: reports, isLoading, refetch } = trpc.company.surveyReport.list.useQuery();
  const createMutation = trpc.company.surveyReport.create.useMutation();
  const updateMutation = trpc.company.surveyReport.update.useMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    // Datos básicos
    periodoAplicacion: "",
    fechaInicio: "",
    fechaFin: "",
    // a) Datos del centro de trabajo
    nombreCentroTrabajo: "",
    domicilioCentroTrabajo: "",
    actividadPrincipal: "",
    // b) Objetivo
    objetivoInforme: "",
    // c) Principales actividades realizadas
    actividadesRealizadas: "",
    // d) Método utilizado
    metodoUtilizado: "",
    // e) Resultados obtenidos
    resultadosObtenidos: "",
    nivelRiesgoGeneral: "bajo" as "bajo" | "medio" | "alto" | "muy_alto",
    // f) Conclusiones
    conclusiones: "",
    // g) Recomendaciones y acciones
    recomendaciones: "",
    accionesIntervencion: "",
    // h) Datos del responsable
    nombreResponsableEvaluacion: "",
    cedulaProfesional: "",
    // Observaciones adicionales
    observaciones: "",
  });

  const resetForm = () => {
    setFormData({
      periodoAplicacion: "",
      fechaInicio: "",
      fechaFin: "",
      nombreCentroTrabajo: "",
      domicilioCentroTrabajo: "",
      actividadPrincipal: "",
      objetivoInforme: "",
      actividadesRealizadas: "",
      metodoUtilizado: "",
      resultadosObtenidos: "",
      nivelRiesgoGeneral: "bajo",
      conclusiones: "",
      recomendaciones: "",
      accionesIntervencion: "",
      nombreResponsableEvaluacion: "",
      cedulaProfesional: "",
      observaciones: "",
    });
    setEditingId(null);
  };

  const handleEdit = (report: any) => {
    setFormData({
      periodoAplicacion: report.periodoAplicacion,
      fechaInicio: report.fechaInicio ? new Date(report.fechaInicio).toISOString().split('T')[0] : "",
      fechaFin: report.fechaFin ? new Date(report.fechaFin).toISOString().split('T')[0] : "",
      nombreCentroTrabajo: report.nombreCentroTrabajo || "",
      domicilioCentroTrabajo: report.domicilioCentroTrabajo || "",
      actividadPrincipal: report.actividadPrincipal || "",
      objetivoInforme: report.objetivoInforme || "",
      actividadesRealizadas: report.actividadesRealizadas || "",
      metodoUtilizado: report.metodoUtilizado || "",
      resultadosObtenidos: report.resultadosObtenidos || "",
      nivelRiesgoGeneral: report.nivelRiesgoGeneral || "bajo",
      conclusiones: report.conclusiones || "",
      recomendaciones: report.recomendaciones || "",
      accionesIntervencion: report.accionesIntervencion || "",
      nombreResponsableEvaluacion: report.nombreResponsableEvaluacion || "",
      cedulaProfesional: report.cedulaProfesional || "",
      observaciones: report.observaciones || "",
    });
    setEditingId(report.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        periodoAplicacion: formData.periodoAplicacion,
        fechaInicio: formData.fechaInicio,
        fechaFin: formData.fechaFin,
        nombreCentroTrabajo: formData.nombreCentroTrabajo || undefined,
        domicilioCentroTrabajo: formData.domicilioCentroTrabajo || undefined,
        actividadPrincipal: formData.actividadPrincipal || undefined,
        objetivoInforme: formData.objetivoInforme || undefined,
        actividadesRealizadas: formData.actividadesRealizadas || undefined,
        metodoUtilizado: formData.metodoUtilizado || undefined,
        resultadosObtenidos: formData.resultadosObtenidos || undefined,
        nivelRiesgoGeneral: formData.nivelRiesgoGeneral,
        conclusiones: formData.conclusiones || undefined,
        recomendaciones: formData.recomendaciones || undefined,
        accionesIntervencion: formData.accionesIntervencion || undefined,
        nombreResponsableEvaluacion: formData.nombreResponsableEvaluacion || undefined,
        cedulaProfesional: formData.cedulaProfesional || undefined,
        observaciones: formData.observaciones || undefined,
      };

      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...data,
        });
        toast({
          title: "Reporte actualizado",
          description: "Los datos del informe NOM-035 se han actualizado correctamente",
        });
      } else {
        await createMutation.mutateAsync(data);
        toast({
          title: "Reporte registrado",
          description: "El informe NOM-035 se ha registrado correctamente",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el informe",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <Breadcrumbs 
        items={[
          { label: "Prevención de Riesgos Psicosociales" },
          { label: "Informe Numeral 7.5" }
        ]} 
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Informe de identificación y análisis de factores de riesgo psicosocial (Numeral 7.5)</h1>
          </div>
          <p className="text-muted-foreground">
            NOM-035-STPS-2018 - Factores de riesgo psicosocial en el trabajo
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Informe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Informe NOM-035" : "Nuevo Informe NOM-035"}
              </DialogTitle>
              <DialogDescription>
                Complete el informe conforme al numeral 7.5 de la NOM-035-STPS-2018
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="basicos" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basicos">Básicos</TabsTrigger>
                  <TabsTrigger value="centro">Centro</TabsTrigger>
                  <TabsTrigger value="metodologia">Metodología</TabsTrigger>
                  <TabsTrigger value="resultados">Resultados</TabsTrigger>
                  <TabsTrigger value="responsable">Responsable</TabsTrigger>
                </TabsList>

                {/* Tab 1: Datos Básicos */}
                <TabsContent value="basicos" className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="periodoAplicacion">
                      Periodo de Aplicación <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="periodoAplicacion"
                      value={formData.periodoAplicacion}
                      onChange={(e) => setFormData({ ...formData, periodoAplicacion: e.target.value })}
                      placeholder="Ej: 2024-Q1, Enero-Marzo 2024"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fechaInicio">
                        Fecha de Inicio <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fechaInicio"
                        type="date"
                        value={formData.fechaInicio}
                        onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fechaFin">
                        Fecha de Finalización <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fechaFin"
                        type="date"
                        value={formData.fechaFin}
                        onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="objetivoInforme">b) Objetivo del Informe</Label>
                    <textarea
                      id="objetivoInforme"
                      value={formData.objetivoInforme}
                      onChange={(e) => setFormData({ ...formData, objetivoInforme: e.target.value })}
                      placeholder="Describir el objetivo del informe de evaluación"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </TabsContent>

                {/* Tab 2: Datos del Centro de Trabajo */}
                <TabsContent value="centro" className="space-y-4 py-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">a) Datos del Centro de Trabajo</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nombreCentroTrabajo">1) Nombre, denominación o razón social</Label>
                    <Input
                      id="nombreCentroTrabajo"
                      value={formData.nombreCentroTrabajo}
                      onChange={(e) => setFormData({ ...formData, nombreCentroTrabajo: e.target.value })}
                      placeholder="Nombre del centro de trabajo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domicilioCentroTrabajo">2) Domicilio</Label>
                    <textarea
                      id="domicilioCentroTrabajo"
                      value={formData.domicilioCentroTrabajo}
                      onChange={(e) => setFormData({ ...formData, domicilioCentroTrabajo: e.target.value })}
                      placeholder="Dirección completa del centro de trabajo"
                      rows={2}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actividadPrincipal">3) Actividad principal</Label>
                    <textarea
                      id="actividadPrincipal"
                      value={formData.actividadPrincipal}
                      onChange={(e) => setFormData({ ...formData, actividadPrincipal: e.target.value })}
                      placeholder="Describir la actividad principal del centro de trabajo"
                      rows={2}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actividadesRealizadas">c) Principales actividades realizadas en el centro de trabajo</Label>
                    <textarea
                      id="actividadesRealizadas"
                      value={formData.actividadesRealizadas}
                      onChange={(e) => setFormData({ ...formData, actividadesRealizadas: e.target.value })}
                      placeholder="Describir las principales actividades realizadas"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </TabsContent>

                {/* Tab 3: Metodología */}
                <TabsContent value="metodologia" className="space-y-4 py-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">d) Método Utilizado</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metodoUtilizado">Método utilizado conforme al numeral 7.4</Label>
                    <textarea
                      id="metodoUtilizado"
                      value={formData.metodoUtilizado}
                      onChange={(e) => setFormData({ ...formData, metodoUtilizado: e.target.value })}
                      placeholder="Describir el método utilizado para la identificación y análisis (Guía I, II o III)"
                      rows={4}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </TabsContent>

                {/* Tab 4: Resultados y Conclusiones */}
                <TabsContent value="resultados" className="space-y-4 py-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Resultados y Conclusiones</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resultadosObtenidos">e) Resultados obtenidos</Label>
                    <textarea
                      id="resultadosObtenidos"
                      value={formData.resultadosObtenidos}
                      onChange={(e) => setFormData({ ...formData, resultadosObtenidos: e.target.value })}
                      placeholder="Describir los resultados obtenidos de acuerdo con el numeral 7.4, inciso d)"
                      rows={4}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nivelRiesgoGeneral">Nivel de Riesgo General</Label>
                    <select
                      id="nivelRiesgoGeneral"
                      value={formData.nivelRiesgoGeneral}
                      onChange={(e) => setFormData({ ...formData, nivelRiesgoGeneral: e.target.value as any })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="bajo">Bajo / Nulo</option>
                      <option value="medio">Medio</option>
                      <option value="alto">Alto</option>
                      <option value="muy_alto">Muy Alto</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conclusiones">f) Conclusiones</Label>
                    <textarea
                      id="conclusiones"
                      value={formData.conclusiones}
                      onChange={(e) => setFormData({ ...formData, conclusiones: e.target.value })}
                      placeholder="Conclusiones del informe"
                      rows={4}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recomendaciones">g) Recomendaciones</Label>
                    <textarea
                      id="recomendaciones"
                      value={formData.recomendaciones}
                      onChange={(e) => setFormData({ ...formData, recomendaciones: e.target.value })}
                      placeholder="Recomendaciones derivadas del análisis"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accionesIntervencion">g) Acciones de intervención</Label>
                    <textarea
                      id="accionesIntervencion"
                      value={formData.accionesIntervencion}
                      onChange={(e) => setFormData({ ...formData, accionesIntervencion: e.target.value })}
                      placeholder="Acciones de intervención propuestas"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones adicionales</Label>
                    <textarea
                      id="observaciones"
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      placeholder="Observaciones generales"
                      rows={2}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </TabsContent>

                {/* Tab 5: Responsable */}
                <TabsContent value="responsable" className="space-y-4 py-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">h) Datos del Responsable de la Evaluación</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nombreResponsableEvaluacion">1) Nombre completo</Label>
                    <Input
                      id="nombreResponsableEvaluacion"
                      value={formData.nombreResponsableEvaluacion}
                      onChange={(e) => setFormData({ ...formData, nombreResponsableEvaluacion: e.target.value })}
                      placeholder="Nombre completo del responsable"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cedulaProfesional">2) Número de cédula profesional</Label>
                    <Input
                      id="cedulaProfesional"
                      value={formData.cedulaProfesional}
                      onChange={(e) => setFormData({ ...formData, cedulaProfesional: e.target.value })}
                      placeholder="Cédula profesional (en su caso)"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Informe"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Informes */}
      {reports && reports.length > 0 ? (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {report.periodoAplicacion}
                    </CardTitle>
                    <CardDescription>
                      {new Date(report.fechaInicio).toLocaleDateString("es-MX")} - {new Date(report.fechaFin).toLocaleDateString("es-MX")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(report)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.nombreCentroTrabajo && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Centro de Trabajo</p>
                    <p className="text-sm">{report.nombreCentroTrabajo}</p>
                  </div>
                )}
                {report.objetivoInforme && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Objetivo</p>
                    <p className="text-sm">{report.objetivoInforme}</p>
                  </div>
                )}
                {report.nivelRiesgoGeneral && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nivel de Riesgo</p>
                    <p className={`text-lg font-semibold ${
                      report.nivelRiesgoGeneral === "bajo" ? "text-green-600" :
                      report.nivelRiesgoGeneral === "medio" ? "text-yellow-600" :
                      report.nivelRiesgoGeneral === "alto" ? "text-orange-600" :
                      "text-red-600"
                    }`}>
                      {report.nivelRiesgoGeneral.replace("_", " ").toUpperCase()}
                    </p>
                  </div>
                )}
                {report.nombreResponsableEvaluacion && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Responsable</p>
                    <p className="text-sm">
                      {report.nombreResponsableEvaluacion}
                      {report.cedulaProfesional && ` (Cédula: ${report.cedulaProfesional})`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No hay informes NOM-035 registrados</p>
            <p className="text-sm text-muted-foreground mb-4">
              Agregue el primer informe de identificación y análisis de factores de riesgo psicosocial
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
