import { useRef, useEffect, useState, useCallback } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  PenLine,
  CheckCircle2,
  XCircle,
  Trash2,
  Send,
  FileText,
  Building2,
  User,
  BookOpen,
  Clock,
  AlertTriangle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Canvas de firma ──────────────────────────────────────────────────────────

function SignatureCanvas({
  onSignatureChange,
}: {
  onSignatureChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e, canvas);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      setHasSignature(true);
      onSignatureChange(canvas.toDataURL("image/png"));
    },
    [onSignatureChange]
  );

  const stopDraw = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  }, [onSignatureChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDraw);
    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full touch-none cursor-crosshair"
          style={{ display: "block" }}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              Firme aquí con su dedo o ratón
            </p>
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={clearCanvas}
        disabled={!hasSignature}
        className="self-end"
      >
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        Borrar firma
      </Button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DC3RemoteSign() {
  const [, params] = useRoute("/firmar-dc3/:token");
  const token = params?.token ?? "";

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const tokenQuery = trpc.dc3RemoteSign.getToken.useQuery(
    { token },
    { enabled: token.length > 0, staleTime: 30_000 }
  );

  const submitMutation = trpc.dc3RemoteSign.submitSignature.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = () => {
    if (!signatureDataUrl) return;
    submitMutation.mutate({ token, signatureDataUrl });
  };

  // ── Estado: cargando ──────────────────────────────────────────────────────
  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Cargando solicitud de firma…</span>
        </div>
      </div>
    );
  }

  const data = tokenQuery.data;

  // ── Estado: token no encontrado ───────────────────────────────────────────
  if (!data || data.status === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">Enlace no válido</p>
              <p className="text-red-700 text-sm mt-1">
                Este enlace de firma no existe o ya fue eliminado. Solicite un
                nuevo enlace al administrador del sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Estado: token expirado ────────────────────────────────────────────────
  if (data.status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-orange-200 bg-orange-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <Clock className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-orange-800">Enlace expirado</p>
              <p className="text-orange-700 text-sm mt-1">
                Este enlace de firma venció el{" "}
                {data.expiresAt
                  ? new Date(data.expiresAt).toLocaleString("es-MX")
                  : "—"}
                . Solicite un nuevo enlace al administrador del sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Estado: ya fue usado ──────────────────────────────────────────────────
  if (data.status === "used") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-green-800">Firma ya registrada</p>
              <p className="text-green-700 text-sm mt-1">
                La firma fue registrada exitosamente el{" "}
                {data.usedAt
                  ? new Date(data.usedAt).toLocaleString("es-MX")
                  : "—"}
                . Este enlace ya no puede usarse nuevamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Estado: firma enviada exitosamente ────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-green-800">
                ¡Firma registrada exitosamente!
              </p>
              <p className="text-green-700 text-sm mt-1">
                Su firma como <strong>{data.token.roleLabel}</strong> ha sido
                guardada en la constancia DC-3. Puede cerrar esta ventana.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Estado: válido — mostrar formulario de firma ──────────────────────────
  const record = data.record;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Encabezado */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-primary/10 rounded-full p-3">
              <PenLine className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Firma de Constancia DC-3
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Se le solicita firmar como <strong>{data.token.roleLabel}</strong>
          </p>
          {data.token.signerName && (
            <p className="text-sm text-foreground mt-0.5">
              Firmante: <strong>{data.token.signerName}</strong>
            </p>
          )}
        </div>

        {/* Advertencia de expiración */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-3 pb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              Este enlace expira el{" "}
              <strong>
                {new Date(data.token.expiresAt).toLocaleString("es-MX")}
              </strong>
              . Use este enlace una sola vez.
            </p>
          </CardContent>
        </Card>

        {/* Datos del registro DC-3 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              Constancia a firmar
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Trabajador" value={record.workerName} />
            </div>
            <div className="col-span-2">
              <Field label="Empresa" value={record.companyName} />
            </div>
            <div className="col-span-2">
              <Field label="Curso" value={record.courseName} />
            </div>
            <Field
              label="Período"
              value={
                record.periodStartDate && record.periodEndDate
                  ? `${String(record.periodStartDate).slice(0, 10)} — ${String(record.periodEndDate).slice(0, 10)}`
                  : null
              }
            />
            <Field
              label="Duración"
              value={
                record.courseDurationHours
                  ? `${record.courseDurationHours} hrs`
                  : null
              }
            />
            {record.folioNumber && (
              <div className="col-span-2">
                <Field label="Folio" value={record.folioNumber} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Canvas de firma */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <PenLine className="w-4 h-4" />
              Su firma como {data.token.roleLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureCanvas onSignatureChange={setSignatureDataUrl} />
          </CardContent>
        </Card>

        {/* Error al enviar */}
        {submitMutation.isError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-3 pb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-800">
                {submitMutation.error?.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Botón de envío */}
        <Button
          className="w-full"
          size="lg"
          disabled={!signatureDataUrl || submitMutation.isPending}
          onClick={handleSubmit}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Registrando firma…
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Confirmar y enviar firma
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Al enviar su firma, acepta que la misma quedará registrada en la
          constancia DC-3 con fecha y hora del servidor.
        </p>
      </div>
    </div>
  );
}
