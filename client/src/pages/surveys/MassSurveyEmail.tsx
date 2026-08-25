import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Mail, Send, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MassSurveyEmail() {
  const [surveyId, setSurveyId] = useState<number | null>(null);
  const [recipientType, setRecipientType] = useState<
    "all" | "department" | "position"
  >("all");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Queries
  const { data: surveys } = trpc.surveys.getAll.useQuery();
  const { data: selectedSurvey } = trpc.surveys.getById.useQuery(surveyId!, {
    enabled: !!surveyId,
  });

  // Mutation
  const sendMassEmail = trpc.surveys.sendMassEmail.useMutation({
    onSuccess: result => {
      toast.success(
        `✅ Envío completado: ${result.sent} correos enviados, ${result.failed} fallidos`
      );
      // Reset form
      setSurveyId(null);
      setRecipientType("all");
      setCustomMessage("");
    },
    onError: error => {
      toast.error(`❌ Error al enviar: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!surveyId) {
      toast.error("Selecciona una encuesta");
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSend = () => {
    if (!surveyId) return;

    sendMassEmail.mutate({
      surveyId,
      recipientType,
      departmentId:
        recipientType === "department" && departmentId !== null
          ? departmentId
          : undefined,
      positionId:
        recipientType === "position" && positionId !== null
          ? positionId
          : undefined,
      customMessage: customMessage || undefined,
    });

    setShowConfirmDialog(false);
  };

  // Vista previa del correo
  const emailPreview = selectedSurvey
    ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9fafb; padding: 30px; }
    .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invitación a Encuesta NOM-035</h1>
    </div>
    <div class="content">
      <h2>${selectedSurvey.title}</h2>
      <p>${selectedSurvey.description || "Encuesta de evaluación de factores de riesgo psicosocial"}</p>
      ${customMessage ? `<p><strong>Mensaje:</strong> ${customMessage}</p>` : ""}
      <p>Has sido seleccionado para participar en esta encuesta. Tu participación es importante para mejorar el ambiente laboral.</p>
      <a href="[ENLACE_ÚNICO]" class="button">Acceder a la Encuesta</a>
      <p><small>Este enlace es único y válido por 30 días.</small></p>
    </div>
    <div class="footer">
      <p>Sistema de Gestión de Talento - NOM-035-STPS-2018</p>
    </div>
  </div>
</body>
</html>
  `
    : "";

  return (
    <div className="container py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: "Encuestas", href: "/surveys/dashboard" },
          { label: "Envío Masivo" },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Envío Masivo de Encuestas
        </h1>
        <p className="text-muted-foreground mt-2">
          Envía invitaciones por correo electrónico a los trabajadores
          seleccionados
        </p>
      </div>

      {/* Alert de configuración SMTP */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Asegúrate de que la configuración SMTP esté correctamente configurada
          en Administración &gt; Configuración
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Envío</CardTitle>
            <CardDescription>
              Selecciona la encuesta y los destinatarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selección de Encuesta */}
            <div className="space-y-2">
              <Label htmlFor="survey">Encuesta *</Label>
              <Select
                value={surveyId?.toString() || ""}
                onValueChange={value => setSurveyId(parseInt(value))}
              >
                <SelectTrigger id="survey">
                  <SelectValue placeholder="Selecciona una encuesta" />
                </SelectTrigger>
                <SelectContent>
                  {surveys?.map((survey: any) => (
                    <SelectItem key={survey.id} value={survey.id.toString()}>
                      {survey.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Destinatarios */}
            <div className="space-y-2">
              <Label htmlFor="recipientType">Destinatarios *</Label>
              <Select
                value={recipientType}
                onValueChange={value =>
                  setRecipientType(value as "all" | "department" | "position")
                }
              >
                <SelectTrigger id="recipientType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los trabajadores</SelectItem>
                  <SelectItem value="department">Por departamento</SelectItem>
                  <SelectItem value="position">Por puesto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Departamento (condicional) */}
            {recipientType === "department" && (
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Select
                  value={departmentId?.toString() || ""}
                  onValueChange={value => setDepartmentId(parseInt(value))}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Recursos Humanos</SelectItem>
                    <SelectItem value="2">Operaciones</SelectItem>
                    <SelectItem value="3">Administración</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Puesto (condicional) */}
            {recipientType === "position" && (
              <div className="space-y-2">
                <Label htmlFor="position">Puesto</Label>
                <Select
                  value={positionId?.toString() || ""}
                  onValueChange={value => setPositionId(parseInt(value))}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Selecciona un puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Gerente</SelectItem>
                    <SelectItem value="2">Supervisor</SelectItem>
                    <SelectItem value="3">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mensaje Personalizado */}
            <div className="space-y-2">
              <Label htmlFor="customMessage">
                Mensaje Personalizado (Opcional)
              </Label>
              <Textarea
                id="customMessage"
                placeholder="Agrega un mensaje personalizado que se incluirá en el correo..."
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                rows={4}
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                disabled={!surveyId}
                className="flex-1"
              >
                {showPreview ? "Ocultar" : "Vista Previa"}
              </Button>
              <Button
                onClick={handleSend}
                disabled={!surveyId || sendMassEmail.isPending}
                className="flex-1"
              >
                {sendMassEmail.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vista Previa */}
        {showPreview && selectedSurvey && (
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Correo</CardTitle>
              <CardDescription>
                Así se verá el correo que recibirán los trabajadores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border rounded-lg p-4 bg-white overflow-auto max-h-[500px]"
                dangerouslySetInnerHTML={{ __html: emailPreview }}
              />
            </CardContent>
          </Card>
        )}

        {/* Resultado del envío */}
        {sendMassEmail.isSuccess && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Resultado del Envío
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Enviados Exitosamente
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {sendMassEmail.data?.sent || 0}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Fallidos</p>
                  <p className="text-3xl font-bold text-red-600">
                    {sendMassEmail.data?.failed || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Diálogo de Confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar envío masivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará la encuesta "{selectedSurvey?.title}" a{" "}
              {recipientType === "all"
                ? "todos los trabajadores"
                : recipientType === "department"
                  ? "el departamento seleccionado"
                  : "el puesto seleccionado"}
              . Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSend}>
              Confirmar Envío
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
