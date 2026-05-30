import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, FileCode2, AlertCircle, CheckCircle2, Loader2, Building2, Calendar, Users } from "lucide-react";

function downloadUrl(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function StpsFormats() {
  const { toast } = useToast();

  // Shared company config
  const [companyName, setCompanyName] = useState("Empresa NOM-035");
  const [companyRfc, setCompanyRfc] = useState("");
  const [signedBy, setSignedBy] = useState("Responsable NOM-035");
  const [signerTitle, setSignerTitle] = useState("Responsable del Sistema de Gestión NOM-035");
  const [instructorName, setInstructorName] = useState("");

  // DC-1 state
  const [assignmentId, setAssignmentId] = useState("");

  // SIRCE state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Queries
  const { data: completedData, isLoading: loadingCompleted, refetch: refetchCompleted } = trpc.stpsFormats.listCompletedTrainings.useQuery(
    { fromDate: fromDate || undefined, toDate: toDate || undefined },
    { enabled: true }
  );

  // Mutations
  const dc1Mutation = trpc.stpsFormats.generateDC1.useMutation({
    onSuccess: (data) => {
      downloadUrl(data.url, data.fileName);
      toast({ title: "DC-1 generado", description: `Folio: ${data.certNumber}`, variant: "default" });
    },
    onError: (e) => toast({ title: "Error al generar DC-1", description: e.message, variant: "destructive" }),
  });

  const sirceMutation = trpc.stpsFormats.generateSirceXml.useMutation({
    onSuccess: (data) => {
      downloadUrl(data.url, data.fileName);
      toast({ title: "XML SIRCE generado", description: `${data.totalRegistros} registros exportados`, variant: "default" });
    },
    onError: (e) => toast({ title: "Error al generar XML SIRCE", description: e.message, variant: "destructive" }),
  });

  const toggleId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const all = (completedData?.assignments ?? []).map((a) => a.id);
    setSelectedIds(all);
  };

  const clearSelection = () => setSelectedIds([]);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileCode2 className="h-6 w-6 text-blue-600" />
            Formatos STPS / IMSS
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Genera el formato DC-1 (Constancia de Habilidades Laborales) y el archivo XML para carga al sistema SIRCE-STPS.
          </p>
        </div>
        <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
          Art. 153-A LFT
        </Badge>
      </div>

      {/* Datos de la empresa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Datos del Centro de Trabajo
          </CardTitle>
          <CardDescription>Estos datos aparecerán en todos los documentos generados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Razón Social</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Empresa S.A. de C.V." />
            </div>
            <div className="space-y-1">
              <Label>RFC del Centro de Trabajo</Label>
              <Input value={companyRfc} onChange={(e) => setCompanyRfc(e.target.value)} placeholder="EMP123456789" maxLength={13} />
            </div>
            <div className="space-y-1">
              <Label>Nombre del Firmante</Label>
              <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Lic. Juan Pérez" />
            </div>
            <div className="space-y-1">
              <Label>Cargo del Firmante</Label>
              <Input value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} placeholder="Gerente de Recursos Humanos" />
            </div>
            <div className="space-y-1">
              <Label>Instructor / Responsable del Curso</Label>
              <Input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} placeholder="Nombre del instructor" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dc1">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="dc1" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            DC-1 Individual
          </TabsTrigger>
          <TabsTrigger value="sirce" className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4" />
            XML SIRCE Masivo
          </TabsTrigger>
        </TabsList>

        {/* ── DC-1 Tab ── */}
        <TabsContent value="dc1" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Constancia de Habilidades Laborales (DC-1)</CardTitle>
              <CardDescription>
                Genera el formato DC-1 en PDF para un trabajador específico, basado en su asignación de capacitación completada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-sm text-blue-800">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  El DC-1 se genera a partir de una <strong>asignación de capacitación completada</strong>. Ingresa el ID de la asignación o del certificado existente.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>ID de Asignación de Capacitación</Label>
                  <Input
                    type="number"
                    value={assignmentId}
                    onChange={(e) => setAssignmentId(e.target.value)}
                    placeholder="Ej: 42"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puedes obtener el ID desde el Módulo de Comité → Capacitaciones.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    if (!assignmentId) {
                      toast({ title: "Ingresa un ID de asignación", variant: "destructive" });
                      return;
                    }
                    dc1Mutation.mutate({
                      assignmentId: parseInt(assignmentId),
                      companyName,
                      companyRfc,
                      instructorName,
                      signedBy,
                      signerTitle,
                    });
                  }}
                  disabled={dc1Mutation.isPending || !assignmentId}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {dc1Mutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando PDF...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Generar y Descargar DC-1</>
                  )}
                </Button>
                {dc1Mutation.isSuccess && (
                  <span className="flex items-center gap-1 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Generado correctamente
                  </span>
                )}
              </div>

              {/* Lista de asignaciones completadas */}
              {completedData && completedData.assignments.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Asignaciones completadas disponibles
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">ID</th>
                          <th className="text-left p-2 font-medium">Trabajador</th>
                          <th className="text-left p-2 font-medium">Capacitación</th>
                          <th className="text-left p-2 font-medium">Fecha</th>
                          <th className="text-left p-2 font-medium">Calif.</th>
                          <th className="text-left p-2 font-medium">Cert.</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedData.assignments.slice(0, 20).map((a) => (
                          <tr key={a.id} className="border-t hover:bg-muted/30">
                            <td className="p-2 font-mono text-xs">{a.id}</td>
                            <td className="p-2">{a.employeeName ? `${a.employeeName} ${a.employeeLastName ?? ""}` : "—"}</td>
                            <td className="p-2 max-w-[180px] truncate">{a.trainingTitle}</td>
                            <td className="p-2 text-xs">{a.completionDate ? new Date(a.completionDate).toLocaleDateString("es-MX") : "—"}</td>
                            <td className="p-2">{a.score != null ? `${a.score}/100` : "—"}</td>
                            <td className="p-2">
                              {a.hasCertificate ? (
                                <Badge variant="outline" className="text-green-700 border-green-300 text-xs">Sí</Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-500 text-xs">No</Badge>
                              )}
                            </td>
                            <td className="p-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setAssignmentId(String(a.id))}
                              >
                                Usar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SIRCE Tab ── */}
        <TabsContent value="sirce" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registro de Capacitación SIRCE (XML)</CardTitle>
              <CardDescription>
                Genera el archivo XML con los registros de capacitación para carga al sistema SIRCE de la STPS. Selecciona el período y los registros a incluir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Solo se incluyen asignaciones con <strong>fecha de terminación registrada</strong>. El XML sigue la estructura del estándar SIRCE versión 2.0.
                </span>
              </div>

              {/* Filtros de período */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Fecha de inicio del período
                  </Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Fecha de fin del período
                  </Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchCompleted()}>
                  {loadingCompleted ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buscar registros"}
                </Button>
                {completedData && (
                  <span className="text-sm text-muted-foreground self-center">
                    {completedData.assignments.length} registros encontrados
                  </span>
                )}
              </div>

              {/* Tabla de selección */}
              {completedData && completedData.assignments.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Seleccionar registros a exportar</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                        Seleccionar todos ({completedData.assignments.length})
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
                        Limpiar
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="p-2 w-8"></th>
                          <th className="text-left p-2 font-medium">Trabajador</th>
                          <th className="text-left p-2 font-medium">Capacitación</th>
                          <th className="text-left p-2 font-medium">Duración</th>
                          <th className="text-left p-2 font-medium">Terminación</th>
                          <th className="text-left p-2 font-medium">Calif.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedData.assignments.map((a) => (
                          <tr
                            key={a.id}
                            className={`border-t cursor-pointer hover:bg-muted/30 ${selectedIds.includes(a.id) ? "bg-blue-50" : ""}`}
                            onClick={() => toggleId(a.id)}
                          >
                            <td className="p-2">
                              <Checkbox
                                checked={selectedIds.includes(a.id)}
                                onCheckedChange={() => toggleId(a.id)}
                              />
                            </td>
                            <td className="p-2">{a.employeeName ? `${a.employeeName} ${a.employeeLastName ?? ""}` : "—"}</td>
                            <td className="p-2 max-w-[180px] truncate">{a.trainingTitle}</td>
                            <td className="p-2 text-xs">{a.trainingDuration} hrs.</td>
                            <td className="p-2 text-xs">
                              {a.completionDate ? new Date(a.completionDate).toLocaleDateString("es-MX") : "—"}
                            </td>
                            <td className="p-2">{a.score != null ? `${a.score}/100` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedIds.length} de {completedData.assignments.length} registros seleccionados
                  </p>
                </div>
              )}

              {completedData && completedData.assignments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No se encontraron capacitaciones completadas en el período indicado.
                </div>
              )}

              <Separator />

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    sirceMutation.mutate({
                      fromDate: fromDate || undefined,
                      toDate: toDate || undefined,
                      companyName,
                      companyRfc,
                      trainingIds: selectedIds.length > 0 ? selectedIds : undefined,
                    });
                  }}
                  disabled={sirceMutation.isPending}
                  className="bg-green-700 hover:bg-green-800"
                >
                  {sirceMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando XML...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Generar y Descargar XML SIRCE</>
                  )}
                </Button>
                {sirceMutation.isSuccess && (
                  <span className="flex items-center gap-1 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> {sirceMutation.data?.totalRegistros} registros exportados
                  </span>
                )}
              </div>

              {/* Instrucciones de carga */}
              <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-2 mt-2">
                <p className="font-medium text-foreground">Instrucciones para carga en SIRCE-STPS:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Descarga el archivo XML generado.</li>
                  <li>Ingresa al portal <strong>SIRCE</strong> en <code className="text-xs bg-muted px-1 rounded">sirce.stps.gob.mx</code></li>
                  <li>Selecciona <em>Registrar Capacitación → Carga Masiva → Importar XML</em>.</li>
                  <li>Sube el archivo y valida los registros antes de confirmar.</li>
                  <li>Guarda el acuse de recibo generado por el sistema SIRCE.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
