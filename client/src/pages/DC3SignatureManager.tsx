/**
 * DC3SignatureManager
 *
 * Catálogo de firmantes autorizados para constancias DC-3.
 * Permite:
 *  - Listar firmantes del catálogo companyDigitalSignature
 *  - Capturar una nueva firma con canvas (SignaturePad)
 *  - Registrar firmantes internos y externos (los externos requieren autorización del admin)
 *  - Ver el estado de autorización de cada firmante
 */
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  PenLine,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  UserX,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface NewSignerForm {
  nombreFirmante: string;
  cargo: string;
  departamento: string;
  tipoFirmante: "interno" | "externo";
  firmaData: string;
}

const EMPTY_FORM: NewSignerForm = {
  nombreFirmante: "",
  cargo: "",
  departamento: "",
  tipoFirmante: "interno",
  firmaData: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function AuthBadge({ estado }: { estado: string }) {
  if (estado === "autorizado")
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Autorizado
      </Badge>
    );
  if (estado === "pendiente")
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1">
        <Clock className="w-3 h-3" /> Pendiente
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
      <XCircle className="w-3 h-3" /> Rechazado
    </Badge>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function DC3SignatureManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Estado del diálogo de nuevo firmante
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [form, setForm] = useState<NewSignerForm>(EMPTY_FORM);
  const [captureStep, setCaptureStep] = useState<"form" | "signature">("form");

  // Estado del diálogo de vista previa de firma
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: signers, isLoading } = trpc.company.digitalSignature.list.useQuery();

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = trpc.company.digitalSignature.create.useMutation({
    onSuccess: (data) => {
      utils.company.digitalSignature.list.invalidate();
      setShowNewDialog(false);
      setForm(EMPTY_FORM);
      setCaptureStep("form");
      if (data.requiresAuthorization) {
        toast({
          title: "Firmante externo registrado",
          description:
            "Se enviará una solicitud de autorización al administrador. El firmante estará disponible una vez aprobado.",
        });
      } else {
        toast({ title: "Firmante registrado", description: "El firmante ya está disponible para DC-3." });
      }
    },
    onError: (err) => {
      toast({ title: "Error al registrar firmante", description: err.message, variant: "destructive" });
    },
  });

  const authorizeMutation = trpc.company.digitalSignature.authorize.useMutation({
    onSuccess: (_, vars) => {
      utils.company.digitalSignature.list.invalidate();
      toast({
        title: vars.approved ? "Firmante autorizado" : "Firmante rechazado",
        description: vars.approved
          ? "El firmante puede firmar constancias DC-3."
          : "El firmante ha sido rechazado.",
      });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.company.digitalSignature.delete.useMutation({
    onSuccess: () => {
      utils.company.digitalSignature.list.invalidate();
      toast({ title: "Firmante eliminado" });
    },
    onError: (err) => {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleFormNext = () => {
    if (!form.nombreFirmante.trim() || !form.cargo.trim()) {
      toast({ title: "Campos requeridos", description: "Nombre y cargo son obligatorios.", variant: "destructive" });
      return;
    }
    setCaptureStep("signature");
  };

  const handleSignatureSaved = (dataUrl: string) => {
    setForm((f) => ({ ...f, firmaData: dataUrl }));
  };

  const handleSubmit = () => {
    if (!form.firmaData) {
      toast({ title: "Firma requerida", description: "Capture la firma antes de guardar.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      nombreFirmante: form.nombreFirmante,
      cargo: form.cargo,
      departamento: form.departamento || "General",
      tipoFirmante: form.tipoFirmante,
      firmaData: form.firmaData,
    });
  };

  const handleCloseDialog = () => {
    setShowNewDialog(false);
    setForm(EMPTY_FORM);
    setCaptureStep("form");
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PenLine className="w-6 h-6 text-primary" />
              Catálogo de Firmantes DC-3
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestione los firmantes autorizados para constancias de capacitación (Instructor, Patrón, Rep. Trabajadores).
            </p>
          </div>
          <Button onClick={() => setShowNewDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Firmante
          </Button>
        </div>

        {/* Tarjeta informativa */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-3 text-sm text-blue-800">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Firmantes internos</span> se autorizan automáticamente.{" "}
                <span className="font-semibold">Firmantes externos</span> requieren aprobación del administrador antes
                de poder firmar constancias. Las firmas se almacenan de forma segura en S3 y se incrustan en el PDF al
                momento de exportar.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de firmantes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firmantes registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando firmantes...</div>
            ) : !signers || signers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <PenLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sin firmantes registrados</p>
                <p className="text-sm mt-1">
                  Agregue firmantes para que sus firmas aparezcan en las constancias DC-3.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre del Firmante</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nombreFirmante}</TableCell>
                      <TableCell>{s.cargo}</TableCell>
                      <TableCell>{s.departamento}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {s.tipoFirmante === "interno" ? "Interno" : "Externo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AuthBadge estado={s.estadoAutorizacion} />
                      </TableCell>
                      <TableCell>
                        {s.firmaUrl ? (
                          <button
                            onClick={() => setPreviewUrl(s.firmaUrl)}
                            className="text-xs text-primary underline hover:no-underline"
                          >
                            Ver firma
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {s.estadoAutorizacion === "pendiente" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-7 px-2"
                                onClick={() => authorizeMutation.mutate({ id: s.id, approved: true })}
                                disabled={authorizeMutation.isPending}
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                                onClick={() => authorizeMutation.mutate({ id: s.id, approved: false })}
                                disabled={authorizeMutation.isPending}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                            onClick={() => {
                              if (confirm(`¿Eliminar firmante "${s.nombreFirmante}"?`)) {
                                deleteMutation.mutate({ id: s.id });
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ─── Diálogo: Nuevo firmante ─────────────────────────────────────── */}
        <Dialog open={showNewDialog} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenLine className="w-5 h-5" />
                {captureStep === "form" ? "Datos del firmante" : "Capturar firma"}
              </DialogTitle>
            </DialogHeader>

            {captureStep === "form" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="nombreFirmante">Nombre completo *</Label>
                    <Input
                      id="nombreFirmante"
                      placeholder="Apellido paterno, apellido materno y nombre(s)"
                      value={form.nombreFirmante}
                      onChange={(e) => setForm((f) => ({ ...f, nombreFirmante: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cargo">Cargo *</Label>
                    <Input
                      id="cargo"
                      placeholder="Ej: Instructor, Gerente RH"
                      value={form.cargo}
                      onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="departamento">Departamento</Label>
                    <Input
                      id="departamento"
                      placeholder="Ej: Recursos Humanos"
                      value={form.departamento}
                      onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Tipo de firmante</Label>
                    <Select
                      value={form.tipoFirmante}
                      onValueChange={(v) => setForm((f) => ({ ...f, tipoFirmante: v as "interno" | "externo" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interno">Interno (empleado de la empresa)</SelectItem>
                        <SelectItem value="externo">Externo (instructor o consultor externo)</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.tipoFirmante === "externo" && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5">
                        Los firmantes externos requieren autorización del administrador antes de poder firmar.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button onClick={handleFormNext}>Siguiente: Capturar firma →</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Firme en el área de abajo con el mouse o con el dedo en pantalla táctil.
                </p>
                <SignaturePad
                  signerName={form.nombreFirmante}
                  signerRole={form.cargo}
                  onSave={handleSignatureSaved}
                  onCancel={() => setCaptureStep("form")}
                />
                {form.firmaData && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setCaptureStep("form")}>
                      ← Volver
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Guardando..." : "Guardar firmante"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Diálogo: Vista previa de firma ──────────────────────────────── */}
        <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) setPreviewUrl(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Vista previa de firma</DialogTitle>
            </DialogHeader>
            {previewUrl && (
              <div className="border rounded-lg overflow-hidden bg-white p-4">
                <img src={previewUrl} alt="Firma digitalizada" className="w-full h-auto max-h-40 object-contain" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
