import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardList, Send, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function Investigations() {
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [questionnaireType, setQuestionnaireType] = useState<"mobbing" | "burnout">("mobbing");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const { data: cases } = trpc.earlyWarnings.getCasesAboutToExpire.useQuery();
  const { data: questionnaires } = trpc.investigations.listByCaseId.useQuery(
    { caseId: selectedCaseId! },
    { enabled: !!selectedCaseId }
  );

  const sendQuestionnaireMutation = trpc.investigations.sendQuestionnaire.useMutation({
    onSuccess: () => {
      toast.success("Cuestionario enviado exitosamente");
      setNotes("");
      utils.investigations.listByCaseId.invalidate();
    },
    onError: (error) => {
      toast.error(`Error al enviar cuestionario: ${error.message}`);
    },
  });

  const handleSendQuestionnaire = () => {
    if (!selectedCaseId) {
      toast.error("Selecciona un caso primero");
      return;
    }

    const selectedCase = cases?.cases.find((c) => c.id === selectedCaseId);
    if (!selectedCase) {
      toast.error("Caso no encontrado");
      return;
    }

    sendQuestionnaireMutation.mutate({
      caseId: selectedCaseId,
      questionnaireType,
      employeeId: selectedCase.employeeId,
      sendByEmail: true,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completado</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "expired":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "mobbing" 
      ? <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Mobbing</Badge>
      : <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Burnout</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investigación de Casos</h1>
          <p className="text-muted-foreground">
            Cuestionarios especializados de mobbing y burnout para investigación de casos de riesgo psicosocial
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulario de envío */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Cuestionario
            </CardTitle>
            <CardDescription>
              Envía un cuestionario de investigación al empleado involucrado en el caso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="case">Caso</Label>
              <Select
                value={selectedCaseId?.toString() || ""}
                onValueChange={(value) => setSelectedCaseId(parseInt(value))}
              >
                <SelectTrigger id="case">
                  <SelectValue placeholder="Selecciona un caso" />
                </SelectTrigger>
                <SelectContent>
                  {cases?.cases.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.folio} - {c.employeeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Cuestionario</Label>
              <Select
                value={questionnaireType}
                onValueChange={(value) => setQuestionnaireType(value as "mobbing" | "burnout")}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobbing">Mobbing (Acoso Laboral) - 36 preguntas</SelectItem>
                  <SelectItem value="burnout">Burnout (Síndrome de Desgaste) - 22 preguntas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedCaseId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900 font-medium">Empleado seleccionado:</p>
                <p className="text-sm text-blue-700">
                  {cases?.cases.find((c: any) => c.id === selectedCaseId)?.employeeName || "N/A"}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Se enviará el cuestionario por correo electrónico
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Contexto adicional sobre la investigación..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleSendQuestionnaire}
              disabled={sendQuestionnaireMutation.isPending || !selectedCaseId}
              className="w-full"
            >
              {sendQuestionnaireMutation.isPending ? "Enviando..." : "Enviar Cuestionario"}
            </Button>
          </CardContent>
        </Card>

        {/* Información del cuestionario seleccionado */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Cuestionario</CardTitle>
            <CardDescription>
              Detalles sobre el tipo de cuestionario seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {questionnaireType === "mobbing" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getTypeBadge("mobbing")}
                  <span className="font-semibold">Cuestionario de Mobbing</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Evalúa conductas de acoso laboral según la escala de Leymann. Incluye 36 preguntas con escala de 1 a 5.
                </p>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-purple-900 mb-1">Niveles de riesgo:</p>
                  <ul className="text-purple-700 space-y-1 ml-4 list-disc">
                    <li><strong>Bajo:</strong> Puntaje {'<'} 60</li>
                    <li><strong>Medio:</strong> Puntaje 60-120</li>
                    <li><strong>Alto:</strong> Puntaje {'>'} 120</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getTypeBadge("burnout")}
                  <span className="font-semibold">Cuestionario de Burnout</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Evalúa el síndrome de desgaste profesional según el Maslach Burnout Inventory (MBI). Incluye 22 preguntas con escala de 1 a 7.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-900 mb-1">Niveles de riesgo:</p>
                  <ul className="text-blue-700 space-y-1 ml-4 list-disc">
                    <li><strong>Bajo:</strong> Puntaje {'<'} 44</li>
                    <li><strong>Medio:</strong> Puntaje 44-88</li>
                    <li><strong>Alto:</strong> Puntaje {'>'} 88</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de cuestionarios enviados */}
      {selectedCaseId && (
        <Card>
          <CardHeader>
            <CardTitle>Cuestionarios del Caso</CardTitle>
            <CardDescription>
              Historial de cuestionarios enviados para el caso seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {questionnaires && questionnaires.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha de Envío</TableHead>
                    <TableHead>Fecha de Expiración</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionnaires.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>{getTypeBadge(q.questionnaireType)}</TableCell>
                      <TableCell>{q.employeeName}</TableCell>
                      <TableCell>{new Date(q.sentAt).toLocaleDateString('es-MX')}</TableCell>
                      <TableCell>{new Date(q.expiresAt).toLocaleDateString('es-MX')}</TableCell>
                      <TableCell>{getStatusBadge(q.status)}</TableCell>
                      <TableCell>
                        {q.status === "completed" ? (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/cases/investigations/${q.id}/results`}>Ver Resultados</a>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" disabled>
                            Pendiente
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No se han enviado cuestionarios para este caso</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
