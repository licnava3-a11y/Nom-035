import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface TermsAcceptanceModalProps {
  open: boolean;
  onAccepted: () => void;
}

export function TermsAcceptanceModal({
  open,
  onAccepted,
}: TermsAcceptanceModalProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [checked, setChecked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const acceptMutation = trpc.terms.accept.useMutation({
    onSuccess: () => {
      utils.terms.hasAccepted.invalidate();
      toast.success("Términos aceptados correctamente. Bienvenido al sistema.");
      onAccepted();
    },
    onError: e => toast.error(`Error al registrar aceptación: ${e.message}`),
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50;
    if (atBottom) setHasScrolled(true);
  };

  const handleAccept = () => {
    if (!checked) {
      toast.error("Debes marcar la casilla de confirmación para continuar.");
      return;
    }
    acceptMutation.mutate({
      version: "1.0",
      userAgent: navigator.userAgent,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Aviso de Privacidad y Términos de Uso
            <Badge variant="outline" className="ml-2 text-xs">
              Versión 1.0
            </Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Conforme al Artículo 8 de la Ley Federal de Protección de Datos
            Personales en Posesión de los Particulares (LFPDPPP), debes leer y
            aceptar el aviso de privacidad antes de usar el sistema.
          </p>
        </DialogHeader>

        {/* Contenido desplazable */}
        <ScrollArea
          className="flex-1 border rounded-md"
          onScrollCapture={handleScroll}
        >
          <div
            ref={scrollRef}
            className="p-4 space-y-4 text-sm text-foreground"
          >
            {/* Sección 1 */}
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">
                  1. Responsable del Tratamiento de Datos
                </h3>
                <p className="text-muted-foreground">
                  La empresa responsable del tratamiento de sus datos personales
                  es la organización que administra esta plataforma de gestión
                  de talento humano y cumplimiento de la NOM-035-STPS-2018. Sus
                  datos serán tratados conforme a lo establecido en la LFPDPPP y
                  su Reglamento.
                </p>
              </div>
            </div>

            {/* Sección 2 */}
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">
                  2. Datos Personales Recabados
                </h3>
                <p className="text-muted-foreground">
                  El sistema recaba y trata los siguientes datos personales:
                  nombre completo, CURP, RFC, NSS (IMSS), correo electrónico,
                  teléfono, domicilio, datos laborales (puesto, departamento,
                  fecha de ingreso, salario), datos de salud ocupacional
                  (resultados de evaluaciones NOM-035), historial de
                  capacitación, y registros de vacaciones y ausencias.
                </p>
                <p className="text-muted-foreground mt-1">
                  Se consideran datos sensibles: resultados de evaluaciones
                  psicosociales, datos de salud, y cualquier información que
                  pueda afectar la esfera más íntima del titular.
                </p>
              </div>
            </div>

            {/* Sección 3 */}
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">
                  3. Finalidades del Tratamiento
                </h3>
                <p className="text-muted-foreground">
                  Las finalidades primarias son:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                  <li>Gestión de recursos humanos y nómina</li>
                  <li>
                    Cumplimiento de la NOM-035-STPS-2018 (factores de riesgo
                    psicosocial)
                  </li>
                  <li>
                    Administración de capacitación y competencias laborales
                  </li>
                  <li>Control de asistencia, vacaciones y ausencias</li>
                  <li>
                    Generación de documentos legales y expedientes laborales
                  </li>
                  <li>Cumplimiento de obligaciones ante el IMSS, SAT y STPS</li>
                </ul>
              </div>
            </div>

            {/* Sección 4 */}
            <div>
              <h3 className="font-semibold mb-1">4. Derechos ARCO</h3>
              <p className="text-muted-foreground">
                Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse
                (derechos ARCO) al tratamiento de sus datos personales, conforme
                al Artículo 28 de la LFPDPPP. Para ejercer estos derechos,
                diríjase al área de Recursos Humanos o al responsable de datos
                de su organización.
              </p>
            </div>

            {/* Sección 5 */}
            <div>
              <h3 className="font-semibold mb-1">5. Transferencias de Datos</h3>
              <p className="text-muted-foreground">
                Sus datos podrán ser transferidos a autoridades laborales (STPS,
                IMSS, SAT, INFONAVIT) cuando así lo requiera la ley. No se
                realizarán transferencias a terceros con fines comerciales sin
                su consentimiento expreso.
              </p>
            </div>

            {/* Sección 6 */}
            <div>
              <h3 className="font-semibold mb-1">
                6. Seguridad de la Información
              </h3>
              <p className="text-muted-foreground">
                El sistema implementa medidas de seguridad administrativas,
                técnicas y físicas para proteger sus datos personales contra
                daño, pérdida, alteración, destrucción o uso, acceso o
                tratamiento no autorizados, conforme al Artículo 19 de la
                LFPDPPP.
              </p>
            </div>

            {/* Sección 7 */}
            <div>
              <h3 className="font-semibold mb-1">
                7. Términos de Uso del Sistema
              </h3>
              <p className="text-muted-foreground">
                El acceso a esta plataforma está restringido al personal
                autorizado de la organización. Queda prohibido el uso no
                autorizado, la divulgación de información confidencial a
                terceros, y cualquier acción que comprometa la integridad del
                sistema o de los datos de otros usuarios. El incumplimiento
                podrá resultar en acciones disciplinarias y/o legales.
              </p>
            </div>

            {/* Sección 8 */}
            <div>
              <h3 className="font-semibold mb-1">
                8. Cambios al Aviso de Privacidad
              </h3>
              <p className="text-muted-foreground">
                Cualquier cambio al presente aviso de privacidad será notificado
                a través del sistema con al menos 30 días de anticipación,
                conforme al Artículo 17 de la LFPDPPP. La fecha de la última
                actualización es: <strong>Abril 2026</strong>.
              </p>
            </div>

            {/* Aviso de scroll */}
            {!hasScrolled && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-xs">
                  Desplázate hasta el final para habilitar la aceptación.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          {/* Checkbox de confirmación */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
            <Checkbox
              id="terms-check"
              checked={checked}
              onCheckedChange={v => setChecked(!!v)}
              disabled={!hasScrolled}
            />
            <label
              htmlFor="terms-check"
              className={`text-sm leading-snug cursor-pointer ${!hasScrolled ? "text-muted-foreground" : ""}`}
            >
              He leído y acepto el Aviso de Privacidad y los Términos de Uso del
              sistema. Entiendo que mis datos personales serán tratados conforme
              a lo establecido en la LFPDPPP y la NOM-035-STPS-2018.
            </label>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!checked || acceptMutation.isPending}
            className="w-full"
          >
            {acceptMutation.isPending
              ? "Registrando aceptación..."
              : "Acepto los Términos y Aviso de Privacidad"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Al aceptar, se registrará la fecha, hora y dispositivo de su
            aceptación conforme al Art. 8 LFPDPPP.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
