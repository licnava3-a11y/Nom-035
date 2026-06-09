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
 *  - Botón "Solicitar firma remota" (genera enlace de un solo uso)
 *  - Botón "Reenviar enlace" (renueva token expirado o ya usado)
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Link2,
  RefreshCw,
  Copy,
  Clock,
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
  const [showRemote, setShowRemote] = useState(false);
  const [showRenew, setShowRenew] = useState(false);
  const [selectedSignerId, setSelectedSignerId] = useState<string>("");

  // Formulario de firma remota
  const [remoteEmail, setRemoteEmail] = useState("");
  const [remoteName, setRemoteName] = useState(signerName ?? "");
  const [remoteHours, setRemoteHours] = useState("72");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  // Formulario de renovación
  const [renewEmail, setRenewEmail] = useState("");
  const [renewName, setRenewName] = useState("");
  const [renewHours, setRenewHours] = useState("72");
  const [renewedUrl, setRenewedUrl] = useState<string | null>(null);
  const [expiredTokenId, setExpiredTokenId] = useState<number | null>(null);

  // Queries
  const { data: signers } = trpc.dc3.listSigners.useQuery();
  const { data: remoteTokens, refetch: refetchTokens } = trpc.dc3RemoteSign.listTokens.useQuery(
    { dc3RecordId: dc3Id },
    { enabled: dc3Id > 0 }
  );

  // Token más reciente para este rol
  const latestToken = remoteTokens
    ?.filter((t) => t.role === role)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const hasExpiredOrUsedToken = latestToken && (latestToken.isExpired || latestToken.isUsed);
  const hasActiveToken = latestToken && !latestToken.isExpired && !latestToken.isUsed;

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

  const createTokenMutation = trpc.dc3RemoteSign.createToken.useMutation({
    onSuccess: (data) => {
      setGeneratedUrl(data.signUrl);
      refetchTokens();
      toast({ title: "Enlace generado", description: "El enlace de firma remota fue creado." });
    },
    onError: (err) => {
      toast({ title: "Error al generar enlace", description: err.message, variant: "destructive" });
    },
  });

  const renewTokenMutation = trpc.dc3RemoteSign.renewToken.useMutation({
    onSuccess: (data) => {
      setRenewedUrl(data.signUrl);
      refetchTokens();
      toast({ title: "Enlace renovado", description: "Se generó un nuevo enlace de firma." });
    },
    onError: (err) => {
      toast({ title: "Error al renovar enlace", description: err.message, variant: "destructive" });
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

  const handleCreateRemoteToken = () => {
    createTokenMutation.mutate({
      dc3RecordId: dc3Id,
      role,
      signerName: remoteName || undefined,
      signerEmail: remoteEmail || undefined,
      expiresInHours: parseInt(remoteHours, 10) || 72,
    });
  };

  const handleRenewToken = () => {
    if (!expiredTokenId) return;
    renewTokenMutation.mutate({
      tokenId: expiredTokenId,
      signerName: renewName || undefined,
      signerEmail: renewEmail || undefined,
      expiresInHours: parseInt(renewHours, 10) || 72,
    });
  };

  const handleOpenRenew = () => {
    if (!latestToken) return;
    setExpiredTokenId(latestToken.id);
    setRenewEmail(latestToken.signerEmail ?? "");
    setRenewName(latestToken.signerName ?? signerName ?? "");
    setRenewedUrl(null);
    setShowRenew(true);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Enlace copiado al portapapeles" });
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
        <div className="flex items-center gap-2">
          {hasActiveToken && (
            <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300 bg-amber-50">
              <Clock className="w-3 h-3" /> Enlace activo
            </Badge>
          )}
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
            <div className="flex gap-2 flex-wrap">
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
              Capture la firma directamente en pantalla, seleccione una del catálogo o envíe un enlace remoto al firmante.
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
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50"
                onClick={() => { setGeneratedUrl(null); setShowRemote(true); }}
              >
                <Link2 className="w-3.5 h-3.5" />
                Enviar enlace remoto
              </Button>
              {hasExpiredOrUsedToken && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                  onClick={handleOpenRenew}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reenviar enlace
                </Button>
              )}
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

      {/* ─── Diálogo: Generar enlace de firma remota ──────────────────────── */}
      <Dialog open={showRemote} onOpenChange={(open) => { setShowRemote(open); if (!open) setGeneratedUrl(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              Solicitar firma remota — {label}
            </DialogTitle>
          </DialogHeader>
          {generatedUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enlace generado. Compártalo con el firmante para que pueda firmar desde su dispositivo.
              </p>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                <span className="text-xs font-mono flex-1 break-all text-foreground">{generatedUrl}</span>
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => copyToClipboard(generatedUrl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                El enlace expira en {remoteHours} horas y solo puede usarse una vez.
              </p>
              <DialogFooter>
                <Button onClick={() => { setShowRemote(false); setGeneratedUrl(null); }}>
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Se generará un enlace único para que el firmante pueda firmar desde su dispositivo móvil.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`remote-name-${role}`}>Nombre del firmante</Label>
                  <Input
                    id={`remote-name-${role}`}
                    value={remoteName}
                    onChange={(e) => setRemoteName(e.target.value)}
                    placeholder="Nombre completo..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`remote-email-${role}`}>Correo electrónico (opcional)</Label>
                  <Input
                    id={`remote-email-${role}`}
                    type="email"
                    value={remoteEmail}
                    onChange={(e) => setRemoteEmail(e.target.value)}
                    placeholder="correo@empresa.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`remote-hours-${role}`}>Expiración del enlace</Label>
                  <Select value={remoteHours} onValueChange={setRemoteHours}>
                    <SelectTrigger id={`remote-hours-${role}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                      <SelectItem value="72">72 horas (3 días)</SelectItem>
                      <SelectItem value="120">120 horas (5 días)</SelectItem>
                      <SelectItem value="168">168 horas (7 días)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRemote(false)}>Cancelar</Button>
                <Button
                  onClick={handleCreateRemoteToken}
                  disabled={createTokenMutation.isPending}
                  className="gap-2"
                >
                  {createTokenMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Generando...</>
                  ) : (
                    <><Link2 className="w-4 h-4" />Generar enlace</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Diálogo: Renovar token expirado ─────────────────────────────── */}
      <Dialog open={showRenew} onOpenChange={(open) => { setShowRenew(open); if (!open) setRenewedUrl(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-600" />
              Reenviar enlace de firma — {label}
            </DialogTitle>
          </DialogHeader>
          {renewedUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Nuevo enlace generado. El enlace anterior ya no es válido.
              </p>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                <span className="text-xs font-mono flex-1 break-all text-foreground">{renewedUrl}</span>
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => copyToClipboard(renewedUrl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                El enlace expira en {renewHours} horas y solo puede usarse una vez.
              </p>
              <DialogFooter>
                <Button onClick={() => { setShowRenew(false); setRenewedUrl(null); }}>
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                El enlace anterior expiró o ya fue utilizado. Se generará un nuevo enlace de un solo uso.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`renew-name-${role}`}>Nombre del firmante</Label>
                  <Input
                    id={`renew-name-${role}`}
                    value={renewName}
                    onChange={(e) => setRenewName(e.target.value)}
                    placeholder="Nombre completo..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`renew-email-${role}`}>Correo electrónico (opcional)</Label>
                  <Input
                    id={`renew-email-${role}`}
                    type="email"
                    value={renewEmail}
                    onChange={(e) => setRenewEmail(e.target.value)}
                    placeholder="correo@empresa.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`renew-hours-${role}`}>Nueva expiración del enlace</Label>
                  <Select value={renewHours} onValueChange={setRenewHours}>
                    <SelectTrigger id={`renew-hours-${role}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                      <SelectItem value="72">72 horas (3 días)</SelectItem>
                      <SelectItem value="120">120 horas (5 días)</SelectItem>
                      <SelectItem value="168">168 horas (7 días)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRenew(false)}>Cancelar</Button>
                <Button
                  onClick={handleRenewToken}
                  disabled={renewTokenMutation.isPending || !expiredTokenId}
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {renewTokenMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Renovando...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" />Reenviar enlace</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
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
