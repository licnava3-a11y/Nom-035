import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { SignaturePad } from "@/components/SignaturePad";
import { Save, FileCheck, Plus, Trash2, Building2, ClipboardCheck } from "lucide-react";

interface AccionControl {
  id: string;
  nivel: string;
  descripcion: string;
  fechaProgramada: string;
  responsable: string;
  avance: string;
}

interface Firmante {
  id: string;
  nombre: string;
  cargo: string;
  firma: string;
}

export default function DocumentActaFinalResultados() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const saveActaMutation = trpc.documents.saveActaFinalResultados.useMutation();
  const [esUnidadVerificacion, setEsUnidadVerificacion] = useState(false);
  
  const [formData, setFormData] = useState({
    // Datos del centro de trabajo
    organizacion: "",
    rfc: "",
    domicilio: "",
    telefono: "",
    actividadPrincipal: "",
    fechaEvaluacion: new Date().toISOString().split("T")[0],
    
    // Áreas y trabajadores sujetos al programa
    areasTrabajo: "",
    numeroTrabajadores: "",
    
    // Método utilizado
    metodoUtilizado: "",
    guiaReferencia: "",
    
    // Resultados de la evaluación
    resultadosGenerales: "",
    factoresRiesgoIdentificados: "",
    
    // Datos de Unidad de Verificación (si aplica)
    nombreUnidadVerificacion: "",
    numeroAcreditacion: "",
    numeroAprobacionSTPS: "",
    domicilioUnidadVerificacion: "",
    
    // Datos del dictamen (si aplica)
    claveNorma: "NOM-035-STPS-2018",
    nombreVerificador: "",
    fechaVerificacion: "",
    numeroDictamen: "",
    vigenciaDictamen: "",
    lugarEmisionDictamen: "",
    fechaEmisionDictamen: "",
    numeroRegistroDictamen: "",
  });

  const [accionesControl, setAccionesControl] = useState<AccionControl[]>([
    {
      id: "1",
      nivel: "",
      descripcion: "",
      fechaProgramada: "",
      responsable: "",
      avance: "",
    },
  ]);

  const [firmantes, setFirmantes] = useState<Firmante[]>([
    {
      id: "1",
      nombre: "",
      cargo: "",
      firma: "",
    },
  ]);

  const agregarAccion = () => {
    setAccionesControl([
      ...accionesControl,
      {
        id: Date.now().toString(),
        nivel: "",
        descripcion: "",
        fechaProgramada: "",
        responsable: "",
        avance: "",
      },
    ]);
  };

  const eliminarAccion = (id: string) => {
    setAccionesControl(accionesControl.filter((accion) => accion.id !== id));
  };

  const actualizarAccion = (id: string, campo: keyof AccionControl, valor: string) => {
    setAccionesControl(accionesControl.map((accion) => (accion.id === id ? { ...accion, [campo]: valor } : accion)));
  };

  const agregarFirmante = () => {
    setFirmantes([
      ...firmantes,
      {
        id: Date.now().toString(),
        nombre: "",
        cargo: "",
        firma: "",
      },
    ]);
  };

  const eliminarFirmante = (id: string) => {
    setFirmantes(firmantes.filter((firmante) => firmante.id !== id));
  };

  const actualizarFirmante = (id: string, campo: keyof Firmante, valor: string) => {
    setFirmantes(firmantes.map((firmante) => (firmante.id === id ? { ...firmante, [campo]: valor } : firmante)));
  };

  const handleSave = async () => {
    try {
      // Validar campos obligatorios
      if (!formData.organizacion || !formData.rfc || !formData.metodoUtilizado) {
        alert("Por favor complete todos los campos obligatorios: Organización, RFC y Método Utilizado");
        return;
      }

      // Preparar firmas desde firmantes
      const firmas = firmantes
        .filter(f => f.firma)
        .map(f => ({
          url: f.firma,
          nombre: f.nombre,
          cargo: f.cargo,
          userId: user?.id,
        }));

      const result = await saveActaMutation.mutateAsync({
        title: `Acta Final de Resultados - ${formData.organizacion}`,
        organizacion: formData.organizacion,
        rfc: formData.rfc,
        domicilio: formData.domicilio,
        telefono: formData.telefono,
        actividadPrincipal: formData.actividadPrincipal,
        fechaEvaluacion: formData.fechaEvaluacion,
        esUnidadVerificacion,
        nombreUnidadVerificacion: esUnidadVerificacion ? formData.nombreUnidadVerificacion : undefined,
        numeroAcreditacion: esUnidadVerificacion ? formData.numeroAcreditacion : undefined,
        numeroAprobacionSTPS: esUnidadVerificacion ? formData.numeroAprobacionSTPS : undefined,
        domicilioUnidadVerificacion: esUnidadVerificacion ? formData.domicilioUnidadVerificacion : undefined,
        claveNorma: esUnidadVerificacion ? formData.claveNorma : undefined,
        nombreVerificador: esUnidadVerificacion ? formData.nombreVerificador : undefined,
        fechaVerificacion: esUnidadVerificacion ? formData.fechaVerificacion : undefined,
        numeroDictamen: esUnidadVerificacion ? formData.numeroDictamen : undefined,
        vigenciaDictamen: esUnidadVerificacion ? formData.vigenciaDictamen : undefined,
        lugarEmisionDictamen: esUnidadVerificacion ? formData.lugarEmisionDictamen : undefined,
        fechaEmisionDictamen: esUnidadVerificacion ? formData.fechaEmisionDictamen : undefined,
        numeroRegistroDictamen: esUnidadVerificacion ? formData.numeroRegistroDictamen : undefined,
        metodoUtilizado: formData.metodoUtilizado,
        guiaReferencia: formData.guiaReferencia,
        areasTrabajo: formData.areasTrabajo,
        numeroTrabajadores: formData.numeroTrabajadores,
        resultadosGenerales: formData.resultadosGenerales,
        factoresRiesgoIdentificados: formData.factoresRiesgoIdentificados,
        accionesControl,
        firmas,
        status: "final",
      });

      alert(`✅ Acta final de resultados guardada exitosamente con folio: ${result.folio}`);
      setLocation("/documents");
    } catch (error: any) {
      console.error("Error guardando acta:", error);
      alert(`Error al guardar el acta: ${error.message || "Ocurrió un error inesperado"}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Acta Final de Resultados NOM-035</h1>
        <p className="text-muted-foreground mt-2">
          Documento de resultados de evaluación de factores de riesgo psicosocial y programa de atención
        </p>
      </div>

      {/* Datos del Centro de Trabajo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Datos del Centro de Trabajo Evaluado
          </CardTitle>
          <CardDescription>Información del centro de trabajo donde se realizó la evaluación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizacion">Nombre, Denominación o Razón Social</Label>
            <Input
              id="organizacion"
              value={formData.organizacion}
              onChange={(e) => setFormData({ ...formData, organizacion: e.target.value })}
              placeholder="Nombre completo de la organización"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rfc">Registro Federal de Contribuyentes (RFC)</Label>
              <Input
                id="rfc"
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                placeholder="RFC de la organización"
                maxLength={13}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Teléfono de contacto"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domicilio">Domicilio Completo</Label>
            <Input
              id="domicilio"
              value={formData.domicilio}
              onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
              placeholder="Calle, número, colonia, ciudad, estado, CP"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="actividadPrincipal">Actividad Principal</Label>
              <Input
                id="actividadPrincipal"
                value={formData.actividadPrincipal}
                onChange={(e) => setFormData({ ...formData, actividadPrincipal: e.target.value })}
                placeholder="Giro o actividad económica principal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaEvaluacion">Fecha de Evaluación</Label>
              <Input
                id="fechaEvaluacion"
                type="date"
                value={formData.fechaEvaluacion}
                onChange={(e) => setFormData({ ...formData, fechaEvaluacion: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkbox para Unidad de Verificación */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="esUnidadVerificacion"
              checked={esUnidadVerificacion}
              onCheckedChange={(checked) => setEsUnidadVerificacion(checked as boolean)}
            />
            <Label htmlFor="esUnidadVerificacion" className="text-sm font-medium cursor-pointer">
              La evaluación fue realizada por una Unidad de Verificación acreditada
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Datos de Unidad de Verificación (condicional) */}
      {esUnidadVerificacion && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Datos de la Unidad de Verificación</CardTitle>
              <CardDescription>Información de la unidad de verificación acreditada y aprobada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombreUnidadVerificacion">Nombre, Denominación o Razón Social</Label>
                <Input
                  id="nombreUnidadVerificacion"
                  value={formData.nombreUnidadVerificacion}
                  onChange={(e) => setFormData({ ...formData, nombreUnidadVerificacion: e.target.value })}
                  placeholder="Nombre de la unidad de verificación"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="numeroAcreditacion">Número de Acreditación</Label>
                  <Input
                    id="numeroAcreditacion"
                    value={formData.numeroAcreditacion}
                    onChange={(e) => setFormData({ ...formData, numeroAcreditacion: e.target.value })}
                    placeholder="Número de acreditación"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroAprobacionSTPS">Número de Aprobación STPS</Label>
                  <Input
                    id="numeroAprobacionSTPS"
                    value={formData.numeroAprobacionSTPS}
                    onChange={(e) => setFormData({ ...formData, numeroAprobacionSTPS: e.target.value })}
                    placeholder="Número de aprobación STPS"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domicilioUnidadVerificacion">Domicilio Completo</Label>
                <Input
                  id="domicilioUnidadVerificacion"
                  value={formData.domicilioUnidadVerificacion}
                  onChange={(e) => setFormData({ ...formData, domicilioUnidadVerificacion: e.target.value })}
                  placeholder="Domicilio de la unidad de verificación"
                />
              </div>
            </CardContent>
          </Card>

          {/* Datos del Dictamen */}
          <Card>
            <CardHeader>
              <CardTitle>Datos del Dictamen</CardTitle>
              <CardDescription>Información del dictamen emitido por la unidad de verificación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="claveNorma">Clave y Nombre de la Norma</Label>
                  <Input
                    id="claveNorma"
                    value={formData.claveNorma}
                    onChange={(e) => setFormData({ ...formData, claveNorma: e.target.value })}
                    placeholder="NOM-035-STPS-2018"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombreVerificador">Nombre del Verificador</Label>
                  <Input
                    id="nombreVerificador"
                    value={formData.nombreVerificador}
                    onChange={(e) => setFormData({ ...formData, nombreVerificador: e.target.value })}
                    placeholder="Verificador evaluado y aprobado"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="fechaVerificacion">Fecha de Verificación</Label>
                  <Input
                    id="fechaVerificacion"
                    type="date"
                    value={formData.fechaVerificacion}
                    onChange={(e) => setFormData({ ...formData, fechaVerificacion: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroDictamen">Número de Dictamen</Label>
                  <Input
                    id="numeroDictamen"
                    value={formData.numeroDictamen}
                    onChange={(e) => setFormData({ ...formData, numeroDictamen: e.target.value })}
                    placeholder="Número del dictamen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vigenciaDictamen">Vigencia del Dictamen</Label>
                  <Input
                    id="vigenciaDictamen"
                    type="date"
                    value={formData.vigenciaDictamen}
                    onChange={(e) => setFormData({ ...formData, vigenciaDictamen: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lugarEmisionDictamen">Lugar de Emisión</Label>
                  <Input
                    id="lugarEmisionDictamen"
                    value={formData.lugarEmisionDictamen}
                    onChange={(e) => setFormData({ ...formData, lugarEmisionDictamen: e.target.value })}
                    placeholder="Ciudad, Estado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaEmisionDictamen">Fecha de Emisión</Label>
                  <Input
                    id="fechaEmisionDictamen"
                    type="date"
                    value={formData.fechaEmisionDictamen}
                    onChange={(e) => setFormData({ ...formData, fechaEmisionDictamen: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroRegistroDictamen">Número de Registro del Dictamen (STPS)</Label>
                <Input
                  id="numeroRegistroDictamen"
                  value={formData.numeroRegistroDictamen}
                  onChange={(e) => setFormData({ ...formData, numeroRegistroDictamen: e.target.value })}
                  placeholder="Número de registro emitido por STPS"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Método de Identificación y Análisis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Método de Identificación y Análisis
          </CardTitle>
          <CardDescription>Método utilizado para la evaluación según NOM-035</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metodoUtilizado">Método Utilizado</Label>
            <Select
              value={formData.metodoUtilizado}
              onValueChange={(value) => setFormData({ ...formData, metodoUtilizado: value })}
            >
              <SelectTrigger id="metodoUtilizado">
                <SelectValue placeholder="Seleccione el método utilizado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guia_referencia_ii">Guía de Referencia II (Cuestionario de Identificación)</SelectItem>
                <SelectItem value="guia_referencia_iii">Guía de Referencia III (Cuestionario de Evaluación)</SelectItem>
                <SelectItem value="metodo_patron">Método Desarrollado por el Patrón (Numerales 7.4 y 7.5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.metodoUtilizado === "guia_referencia_ii" && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
              <p className="font-semibold mb-2">Guía de Referencia II - Cuestionario de Identificación</p>
              <p>
                Instrumento de identificación de factores de riesgo psicosocial para centros de trabajo con 16 a 50
                trabajadores.
              </p>
            </div>
          )}

          {formData.metodoUtilizado === "guia_referencia_iii" && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
              <p className="font-semibold mb-2">Guía de Referencia III - Cuestionario de Evaluación</p>
              <p>
                Instrumento de evaluación de factores de riesgo psicosocial y entorno organizacional para centros de
                trabajo con más de 50 trabajadores.
              </p>
            </div>
          )}

          {formData.metodoUtilizado === "metodo_patron" && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="guiaReferencia">Descripción del Método Desarrollado</Label>
              <Textarea
                id="guiaReferencia"
                value={formData.guiaReferencia}
                onChange={(e) => setFormData({ ...formData, guiaReferencia: e.target.value })}
                placeholder="Describa el método desarrollado por el patrón conforme a los numerales 7.4 y 7.5 de la NOM-035..."
                rows={4}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Áreas y Trabajadores Sujetos al Programa */}
      <Card>
        <CardHeader>
          <CardTitle>Áreas de Trabajo y Trabajadores Sujetos al Programa</CardTitle>
          <CardDescription>Alcance del programa de atención (Numeral 8.4 inciso a)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="areasTrabajo">Áreas de Trabajo Incluidas</Label>
            <Textarea
              id="areasTrabajo"
              value={formData.areasTrabajo}
              onChange={(e) => setFormData({ ...formData, areasTrabajo: e.target.value })}
              placeholder="Liste las áreas de trabajo incluidas en el programa (ej: Producción, Administración, Ventas, etc.)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numeroTrabajadores">Número de Trabajadores Sujetos al Programa</Label>
            <Input
              id="numeroTrabajadores"
              type="number"
              value={formData.numeroTrabajadores}
              onChange={(e) => setFormData({ ...formData, numeroTrabajadores: e.target.value })}
              placeholder="Número total de trabajadores"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resultados de la Evaluación */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados de la Evaluación</CardTitle>
          <CardDescription>Resumen de hallazgos y factores de riesgo identificados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resultadosGenerales">Resultados Generales</Label>
            <Textarea
              id="resultadosGenerales"
              value={formData.resultadosGenerales}
              onChange={(e) => setFormData({ ...formData, resultadosGenerales: e.target.value })}
              placeholder="Describa los resultados generales de la evaluación..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="factoresRiesgoIdentificados">Factores de Riesgo Psicosocial Identificados</Label>
            <Textarea
              id="factoresRiesgoIdentificados"
              value={formData.factoresRiesgoIdentificados}
              onChange={(e) => setFormData({ ...formData, factoresRiesgoIdentificados: e.target.value })}
              placeholder="Liste los factores de riesgo psicosocial identificados por dominio y categoría..."
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Programa de Atención - Acciones y Medidas de Control */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Programa de Atención - Acciones y Medidas de Control</CardTitle>
              <CardDescription>
                Acciones por nivel según numeral 8.4 (incisos b, c, d, e, f) y 8.5
              </CardDescription>
            </div>
            <Button onClick={agregarAccion} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Acción
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {accionesControl.map((accion, index) => (
            <div key={accion.id} className="p-4 border rounded-lg space-y-4 relative">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Acción #{index + 1}</h4>
                {accionesControl.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarAccion(accion.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Nivel de Acción (Numeral 8.5)</Label>
                <Select value={accion.nivel} onValueChange={(value) => actualizarAccion(accion.id, "nivel", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el nivel de acción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primer_nivel">
                      Primer Nivel - Organizacional (política, organización del trabajo)
                    </SelectItem>
                    <SelectItem value="segundo_nivel">
                      Segundo Nivel - Grupal (interrelación, sensibilización, apoyo social)
                    </SelectItem>
                    <SelectItem value="tercer_nivel">
                      Tercer Nivel - Individual (clínico/terapéutico por médico, psicólogo o psiquiatra)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descripción de la Acción o Medida de Control</Label>
                <Textarea
                  value={accion.descripcion}
                  onChange={(e) => actualizarAccion(accion.id, "descripcion", e.target.value)}
                  placeholder="Describa detalladamente la acción o medida de control a implementar..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fecha Programada para Realización</Label>
                  <Input
                    type="date"
                    value={accion.fechaProgramada}
                    onChange={(e) => actualizarAccion(accion.id, "fechaProgramada", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsable de Ejecución</Label>
                  <Input
                    value={accion.responsable}
                    onChange={(e) => actualizarAccion(accion.id, "responsable", e.target.value)}
                    placeholder="Nombre del responsable"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Control de Avances</Label>
                <Textarea
                  value={accion.avance}
                  onChange={(e) => actualizarAccion(accion.id, "avance", e.target.value)}
                  placeholder="Describa el mecanismo de control y seguimiento de avances..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Firmantes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Firmas de Responsables</CardTitle>
              <CardDescription>Firmas de los responsables de la elaboración y autorización del acta</CardDescription>
            </div>
            <Button onClick={agregarFirmante} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Firmante
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {firmantes.map((firmante, index) => (
            <div key={firmante.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Firmante #{index + 1}</h4>
                {firmantes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarFirmante(firmante.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input
                    value={firmante.nombre}
                    onChange={(e) => actualizarFirmante(firmante.id, "nombre", e.target.value)}
                    placeholder="Nombre completo del firmante"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo o Puesto</Label>
                  <Input
                    value={firmante.cargo}
                    onChange={(e) => actualizarFirmante(firmante.id, "cargo", e.target.value)}
                    placeholder="Cargo en la organización"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Firma Digital</Label>
                <SignaturePad
                  onSave={(signatureData) => {
                    actualizarFirmante(firmante.id, "firma", signatureData);
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Acta
        </Button>
      </div>
    </div>
  );
}
