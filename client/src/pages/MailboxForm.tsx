import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Send, FileText, MessageSquare, ThumbsUp, GraduationCap } from "lucide-react";
import { useForm } from "react-hook-form";

export default function MailboxForm() {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm();

  const createMutation = trpc.mailbox.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Solicitud enviada correctamente. Folio: ${data.folio}`);
      reset();
      setIsAnonymous(false);
    },
    onError: (error) => {
      toast.error(`Error al enviar solicitud: ${error.message}`);
    },
  });

  const requestType = watch("requestType");
  const complaintType = watch("complaintType");

  const onSubmit = (data: any) => {
    createMutation.mutate({
      requestType: data.requestType,
      complaintType: data.complaintType || undefined,
      subject: data.subject,
      message: data.description,
      isAnonymous,
      senderName: isAnonymous ? undefined : data.senderName,
      senderEmail: isAnonymous ? undefined : data.senderEmail,
      senderPhone: isAnonymous ? undefined : data.senderPhone,
    });
  };

  const getRequestTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactElement> = {
      complaint: <FileText className="h-5 w-5" />,
      suggestion: <MessageSquare className="h-5 w-5" />,
      congratulation: <ThumbsUp className="h-5 w-5" />,
      training_request: <GraduationCap className="h-5 w-5" />,
    };
    return icons[type] || <FileText className="h-5 w-5" />;
  };

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Buzón Electrónico NOM-035</CardTitle>
          <CardDescription>
            Envía tus quejas, sugerencias, felicitaciones o solicitudes de capacitación de forma segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de solicitud */}
            <div className="space-y-2">
              <Label htmlFor="requestType">Tipo de Solicitud *</Label>
              <Select
                onValueChange={(value) => setValue("requestType", value)}
                {...register("requestType", { required: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de solicitud" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">
                    <div className="flex items-center gap-2">
                      {getRequestTypeIcon("complaint")}
                      <span>Queja</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="suggestion">
                    <div className="flex items-center gap-2">
                      {getRequestTypeIcon("suggestion")}
                      <span>Sugerencia</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="congratulation">
                    <div className="flex items-center gap-2">
                      {getRequestTypeIcon("congratulation")}
                      <span>Felicitación</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="training_request">
                    <div className="flex items-center gap-2">
                      {getRequestTypeIcon("training_request")}
                      <span>Solicitud de Capacitación</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.requestType && (
                <p className="text-sm text-destructive">Este campo es requerido</p>
              )}
            </div>

            {/* Tipo de queja (solo si es queja) */}
            {requestType === "complaint" && (
              <div className="space-y-2">
                <Label htmlFor="complaintType">Tipo de Queja *</Label>
                <Select
                  onValueChange={(value) => setValue("complaintType", value)}
                  {...register("complaintType", { required: requestType === "complaint" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de queja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liderazgo_negativo">Liderazgo Negativo</SelectItem>
                    <SelectItem value="entorno_no_favorable">Entorno Organizacional No Favorable</SelectItem>
                    <SelectItem value="conductas_contrarias">Conductas Contrarias al Ambiente Laboral</SelectItem>
                    <SelectItem value="carga_trabajo">Carga de Trabajo Excesiva</SelectItem>
                    <SelectItem value="acoso_laboral">Acoso Laboral</SelectItem>
                    <SelectItem value="acoso_sexual">Acoso Sexual</SelectItem>
                    <SelectItem value="hostigamiento_sexual">Hostigamiento Sexual</SelectItem>
                    <SelectItem value="mobbing">Mobbing</SelectItem>
                    <SelectItem value="burnout">Burnout (Síndrome de Desgaste)</SelectItem>
                    <SelectItem value="falta_control">Falta de Control sobre el Trabajo</SelectItem>
                    <SelectItem value="jornadas_trabajo">Jornadas de Trabajo Excesivas</SelectItem>
                    <SelectItem value="interferencia_trabajo_familia">Interferencia Trabajo-Familia</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
                {errors.complaintType && (
                  <p className="text-sm text-destructive">Este campo es requerido</p>
                )}
              </div>
            )}

            {/* Asunto */}
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto *</Label>
              <Input
                id="subject"
                placeholder="Escribe un asunto breve"
                {...register("subject", { required: true, maxLength: 200 })}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">Este campo es requerido (máximo 200 caracteres)</p>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                placeholder="Describe detalladamente tu solicitud..."
                rows={6}
                {...register("description", { required: true })}
              />
              {errors.description && (
                <p className="text-sm text-destructive">Este campo es requerido</p>
              )}
            </div>

            {/* Solicitud anónima */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
              />
              <Label htmlFor="anonymous" className="cursor-pointer">
                Enviar de forma anónima
              </Label>
            </div>

            {/* Datos del remitente (solo si no es anónimo) */}
            {!isAnonymous && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold">Datos del Remitente</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="senderName">Nombre Completo *</Label>
                  <Input
                    id="senderName"
                    placeholder="Tu nombre completo"
                    {...register("senderName", { required: !isAnonymous })}
                  />
                  {errors.senderName && (
                    <p className="text-sm text-destructive">Este campo es requerido</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderEmail">Correo Electrónico *</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    placeholder="tu@email.com"
                    {...register("senderEmail", { 
                      required: !isAnonymous,
                      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    })}
                  />
                  {errors.senderEmail && (
                    <p className="text-sm text-destructive">Correo electrónico inválido</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderPhone">Teléfono</Label>
                  <Input
                    id="senderPhone"
                    placeholder="(555) 123-4567"
                    {...register("senderPhone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    placeholder="Tu departamento o área"
                    {...register("department")}
                  />
                </div>
              </div>
            )}

            {/* Botón de envío */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setIsAnonymous(false);
                }}
              >
                Limpiar Formulario
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Solicitud
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Todas las solicitudes son tratadas con estricta confidencialidad.</p>
          <p>• Recibirás un folio único para dar seguimiento a tu solicitud.</p>
          <p>• El comité de atención revisará tu solicitud en un plazo máximo de 5 días hábiles.</p>
          <p>• Si proporcionaste tu correo electrónico, recibirás actualizaciones sobre el estado de tu solicitud.</p>
          <p>• Las solicitudes anónimas también son atendidas con la misma prioridad.</p>
        </CardContent>
      </Card>
    </div>
  );
}
