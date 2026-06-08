/**
 * DC3SignaturePanel
 *
 * Panel de firmas digitales para el formulario DC-3.
 * Muestra tres secciones (Instructor, Patrón/Rep. Legal, Rep. Trabajadores),
 * cada una con:
 *  - Vista previa de la firma guardada (si existe)
 *  - Canvas de captura (SignaturePad) para firmar en pantalla
 *  - Opción de seleccionar desde el catálogo de firmantes autorizados
 *  - Botón de borrar firma
 *
 * Props:
 *  - dc3Id: ID del registro DC-3 (requerido para guardar en BD)
 *  - instructorName / employerRepName / workerRepName: nombres de los firmantes
 *  - onSignaturesSaved: callback cuando se guarda alguna firma
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  PenLine,
  CheckCircle2,
  Trash2,
  UserCheck,
  Loader2,
  BookUser,
} from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type SignatureRole = "instructor" | "employer" | "workerRep";

interface SignatureSectionProps {
  dc3Id: number;
  role: SignatureRole;
  label: string;
  signerName: string | null | undefined;
  currentUrl: string | null | undefined;
  onSaved: () => void;
}

// ─── Sección individual de firma ─────────────────────────────────────────────

function SignatureSection({ dc3Id, role, label, signerName, currentUrl, onSaved }: SignatureSectionProps) {
  const { toast } = useToast();
  const [showCapture, setShowCapture] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedSignerId, setSelectedSignerId] = useState<string>("");

  // Queries
  const { data: signers } = trpc.dc3.listSigners.useQuery();

  // Mutations
  const saveMutation = trpc.dc3.saveSignature.useMutation({
    onSuccess: () => {
      toast({ title: "Firma guardada", description: `Firma de ${label} guardada correctamente.` });
      setShowCapture(false);
      setShowCatalog(false);
      onSaved();
    },
    onError: (err) => {
      toast({ title: "Error al guardar firma", description: err.message, variant: "destructive" });
    },
  });

  const clearMutation = trpc.dc3.clearSignature.useMutation({
    onSuccess: () => {
      toast({ title: "Firma eliminada" });
      onSaved();
    },
    onError: (err) => {
      toast({ title: "Error al eliminar firma", description: err.message, variant: "destructive" });
    },
  });

  const handleSignatureCaptured = useCallback((dataUrl: string) => {
    saveMutation.mutate({ id: dc3Id, role, signatureDataUrl: dataUrl });
  }, [dc3Id, role, saveMutation]);

  const handleUseCatalogSignature = () => {
    if (!selectedSignerId) {
      toast({ title: "Seleccione un firmante", variant: "destructive" });
      return;
    }
    const signer = signers?.find((s) => String(s.id) === selectedSignerId);
    if (!signer?.firmaUrl) {
      toast({ title: "El firmante no tiene firma registrada", variant: "destructive" });
      return;
    }
    // Convertir URL de S3 a dataUrl para guardar
    // Descargamos la imagen y la convertimos a base64
    fetch(signer.firmaUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          saveMutation.mutate({ id: dc3Id, role, signatureDataUrl: dataUrl });
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        toast({ title: "Error al cargar la firma del catálogo", variant: "destructive" });
      });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Encabezado */}
      <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{label}</span>
          {signerName && (
            <span className="text-xs text-muted-foreground">— {signerName}</span>
          )}
        </div>
        {currentUrl ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3" /> Firmado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Sin firma
          </Badge>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-3">
        {currentUrl ? (
          /* Vista previa de la firma guardada */
          <div className="space-y-3">
            <div className="border rounded bg-white p-3 flex items-center justify-center min-h-[80px]">
              <img
                src={currentUrl}
                alt={`Firma ${label}`}
                className="max-h-20 w-auto object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowCapture(true)}
              >
                <PenLine className="w-3.5 h-3.5" />
                Reemplazar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm(`¿Eliminar la firma de ${label}?`)) {
                    clearMutation.mutate({ id: dc3Id, role });
                  }
                }}
                disabled={clearMutation.isPending}
              >
                {clearMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Eliminar
              </Button>
            </div>
          </div>
        ) : (
          /* Sin firma: opciones de captura */
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Capture la firma directamente en pantalla o seleccione una del catálogo de firmantes autorizados.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowCapture(true)}
              >
                <PenLine className="w-3.5 h-3.5" />
                Firmar en pantalla
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowCatalog(true)}
                disabled={!signers || signers.length === 0}
              >
                <BookUser className="w-3.5 h-3.5" />
                Usar del catálogo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Diálogo: Captura en pantalla ─────────────────────────────────── */}
      <Dialog open={showCapture} onOpenChange={setShowCapture}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              Capturar firma — {label}
            </DialogTitle>
          </DialogHeader>
          {signerName && (
            <p className="text-sm text-muted-foreground -mt-2">
              Firmante: <span className="font-medium">{signerName}</span>
            </p>
          )}
          <SignaturePad
            signerName={signerName ?? label}
            signerRole={label}
            onSave={handleSignatureCaptured}
            onCancel={() => setShowCapture(false)}
          />
          {saveMutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando firma...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Diálogo: Seleccionar del catálogo ────────────────────────────── */}
      <Dialog open={showCatalog} onOpenChange={setShowCatalog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookUser className="w-5 h-5" />
              Seleccionar firmante — {label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seleccione un firmante autorizado del catálogo para usar su firma registrada.
            </p>
            <Select value={selectedSignerId} onValueChange={setSelectedSignerId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar firmante..." />
              </SelectTrigger>
              <SelectContent>
                {signers?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-green-600" />
                      <span>{s.nombreFirmante}</span>
                      <span className="text-muted-foreground text-xs">— {s.cargo}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSignerId && signers?.find((s) => String(s.id) === selectedSignerId)?.firmaUrl && (
              <div className="border rounded bg-white p-3">
                <img
                  src={signers?.find((s) => String(s.id) === selectedSignerId)?.firmaUrl}
                  alt="Vista previa"
                  className="max-h-16 w-auto object-contain mx-auto"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCatalog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUseCatalogSignature}
                disabled={!selectedSignerId || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Aplicando...</>
                ) : (
                  "Usar esta firma"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente principal: panel de las 3 firmas ─────────────────────────────

interface DC3SignaturePanelProps {
  dc3Id: number;
  instructorName?: string | null;
  employerRepName?: string | null;
  workerRepName?: string | null;
}

export default function DC3SignaturePanel({
  dc3Id,
  instructorName,
  employerRepName,
  workerRepName,
}: DC3SignaturePanelProps) {
  const utils = trpc.useUtils();

  const { data: signatures, isLoading } = trpc.dc3.getSignatures.useQuery(
    { id: dc3Id },
    { enabled: dc3Id > 0 }
  );

  const handleSaved = useCallback(() => {
    utils.dc3.getSignatures.invalidate({ id: dc3Id });
  }, [utils, dc3Id]);

  const signedCount = [
    signatures?.instructorSignatureUrl,
    signatures?.employerSignatureUrl,
    signatures?.workerRepSignatureUrl,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            Firmas Digitales
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {signedCount}/3 firmados
            </span>
            {signedCount === 3 && (
              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completo
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Las firmas se incrustarán automáticamente en el PDF al exportar la constancia DC-3.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando firmas...
          </div>
        ) : (
          <>
            <SignatureSection
              dc3Id={dc3Id}
              role="instructor"
              label="Instructor o Tutor"
              signerName={instructorName}
              currentUrl={signatures?.instructorSignatureUrl}
              onSaved={handleSaved}
            />
            <SignatureSection
              dc3Id={dc3Id}
              role="employer"
              label="Patrón o Representante Legal"
              signerName={employerRepName}
              currentUrl={signatures?.employerSignatureUrl}
              onSaved={handleSaved}
            />
            <SignatureSection
              dc3Id={dc3Id}
              role="workerRep"
              label="Representante de los Trabajadores"
              signerName={workerRepName}
              currentUrl={signatures?.workerRepSignatureUrl}
              onSaved={handleSaved}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
