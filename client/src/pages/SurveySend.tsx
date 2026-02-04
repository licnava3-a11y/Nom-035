import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Users, 
  Mail, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function SurveySend() {
  const [, setLocation] = useLocation();
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Obtener guías requeridas según cantidad de trabajadores
  const { data: surveyRequirements, isLoading: loadingRequirements } = 
    trpc.surveyDistribution.getRequiredSurveys.useQuery();

  // Obtener empleados elegibles
  const { data: employees, isLoading: loadingEmployees } = 
    trpc.surveyDistribution.getEligibleEmployees.useQuery(
      { 
        surveyId: selectedSurveyId!, 
        excludeCompleted: true 
      },
      { enabled: !!selectedSurveyId }
    );

  // Obtener estadísticas de la encuesta seleccionada
  const { data: stats } = trpc.surveyDistribution.getSurveyStats.useQuery(
    { surveyId: selectedSurveyId! },
    { enabled: !!selectedSurveyId }
  );

  // Mutation para enviar invitaciones
  const sendMutation = trpc.surveyDistribution.sendSurveyInvitations.useMutation({
    onSuccess: (result) => {
      toast.success(`Invitaciones enviadas: ${result.sent} exitosas, ${result.failed} fallidas`);
      if (result.errors.length > 0) {
        console.error("Errores de envío:", result.errors);
      }
      setSelectedEmployees([]);
      setCustomSubject("");
      setCustomMessage("");
    },
    onError: (error) => {
      toast.error(`Error al enviar invitaciones: ${error.message}`);
    },
  });

  const handleSelectAll = () => {
    if (employees) {
      if (selectedEmployees.length === employees.length) {
        setSelectedEmployees([]);
      } else {
        setSelectedEmployees(employees.map(e => e.id));
      }
    }
  };

  const handleToggleEmployee = (employeeId: number) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSend = () => {
    if (!selectedSurveyId) {
      toast.error("Por favor selecciona una encuesta");
      return;
    }

    if (selectedEmployees.length === 0) {
      toast.error("Por favor selecciona al menos un empleado");
      return;
    }

    sendMutation.mutate({
      surveyId: selectedSurveyId,
      employeeIds: selectedEmployees,
      subject: customSubject || undefined,
      customMessage: customMessage || undefined,
    });
  };

  if (loadingRequirements) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => setLocation("/surveys/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Envío Masivo de Encuestas NOM-035</h1>
          <p className="text-muted-foreground mt-1">
            Envía encuestas por correo electrónico a tus colaboradores
          </p>
        </div>
      </div>

      {/* Información de guías requeridas */}
      <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-4">
          <Users className="h-6 w-6 text-blue-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">Guías Requeridas según NOM-035</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {surveyRequirements?.recommendation}
            </p>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {surveyRequirements?.employeeCount} trabajadores activos
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {surveyRequirements?.surveys.map(survey => (
                <Badge key={survey.id} variant="default" className="px-3 py-1">
                  {survey.title}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Selección de encuesta */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">1. Selecciona la Encuesta</h3>
        <Select 
          value={selectedSurveyId?.toString()} 
          onValueChange={(value) => setSelectedSurveyId(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una encuesta..." />
          </SelectTrigger>
          <SelectContent>
            {surveyRequirements?.surveys.map(survey => (
              <SelectItem key={survey.id} value={survey.id.toString()}>
                {survey.title} - {survey.type.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Estadísticas de la encuesta seleccionada */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Enviadas</div>
              <div className="text-2xl font-bold">{stats.sent}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Completadas</div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Pendientes</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Tasa de Respuesta</div>
              <div className="text-2xl font-bold text-blue-600">{stats.completionRate}%</div>
            </div>
          </div>
        )}
      </Card>

      {/* Selección de destinatarios */}
      {selectedSurveyId && (
        <>
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">2. Selecciona Destinatarios</h3>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedEmployees.length === employees?.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
              </Button>
            </div>

            {loadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : employees && employees.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {employees.map(employee => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => handleToggleEmployee(employee.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{employee.name || "Sin nombre"}</div>
                      <div className="text-sm text-muted-foreground">
                        {employee.email || "Sin correo"} • {employee.departamento || "Sin departamento"} • {employee.puesto || "Sin puesto"}
                      </div>
                    </div>
                    {!employee.email && (
                      <Badge variant="destructive">Sin correo</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Todos los empleados ya han completado esta encuesta</p>
              </div>
            )}

            {selectedEmployees.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  {selectedEmployees.length} empleado(s) seleccionado(s)
                </p>
              </div>
            )}
          </Card>

          {/* Personalización del correo */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">3. Personaliza el Correo (Opcional)</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Asunto del Correo</Label>
                <Input
                  id="subject"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Dejar vacío para usar el asunto predeterminado"
                />
              </div>
              <div>
                <Label htmlFor="message">Mensaje Personalizado</Label>
                <Textarea
                  id="message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Agrega un mensaje personalizado que aparecerá en el correo..."
                  rows={4}
                />
              </div>
            </div>
          </Card>

          {/* Botones de acción */}
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={handleSend}
              disabled={selectedEmployees.length === 0 || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Invitaciones ({selectedEmployees.length})
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Ocultar" : "Ver"} Preview
            </Button>
          </div>

          {/* Preview del correo */}
          {showPreview && (
            <Card className="p-6 mt-6 bg-gray-50">
              <h3 className="font-semibold text-lg mb-4">Preview del Correo</h3>
              <div className="bg-white p-6 rounded-lg border">
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground">Asunto:</div>
                  <div className="font-semibold">
                    {customSubject || `Encuesta NOM-035: ${surveyRequirements?.surveys.find(s => s.id === selectedSurveyId)?.title}`}
                  </div>
                </div>
                <hr className="my-4" />
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-blue-600">Encuesta NOM-035 STPS 2018</h2>
                  <p>Estimado(a) <strong>[Nombre del Empleado]</strong>,</p>
                  {customMessage && (
                    <p className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                      {customMessage}
                    </p>
                  )}
                  <p>Se le invita a completar la siguiente encuesta como parte del cumplimiento de la NOM-035-STPS-2018:</p>
                  <div className="bg-gray-100 p-4 rounded">
                    <h3 className="font-semibold">
                      {surveyRequirements?.surveys.find(s => s.id === selectedSurveyId)?.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {surveyRequirements?.surveys.find(s => s.id === selectedSurveyId)?.description}
                    </p>
                  </div>
                  <div className="text-center">
                    <Button className="pointer-events-none">
                      Responder Encuesta
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
