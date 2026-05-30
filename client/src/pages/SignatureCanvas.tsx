import { useRef, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eraser, PenLine, Upload } from "lucide-react";

interface Props {
  meetingId: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function SignatureCanvas({ meetingId, onClose, onSaved }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const { toast } = useToast();

  const registerSignatureMut = trpc.committeeModule.registerSignature.useMutation({
    onSuccess: () => onSaved(),
    onError: (e) => toast({ title: "Error al registrar firma", description: e.message, variant: "destructive" }),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSave = () => {
    if (!signerName.trim()) {
      toast({ title: "Ingresa el nombre del firmante", variant: "destructive" });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    registerSignatureMut.mutate({
      meetingId,
      signerName: signerName.trim(),
      signerRole: signerRole.trim() || undefined,
      signatureImageBase64: hasSignature ? dataUrl : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-blue-600" />
            Registrar Firma Digital
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nombre del firmante *</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <Label>Rol / Cargo</Label>
              <Input value={signerRole} onChange={(e) => setSignerRole(e.target.value)} placeholder="Ej. Presidente del Comité" />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Firma (dibuja con el ratón o dedo)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={460}
                height={160}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            <div className="flex justify-end mt-1">
              <Button variant="ghost" size="sm" onClick={clearCanvas}>
                <Eraser className="w-4 h-4 mr-1" /> Limpiar
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            La firma se almacena como imagen PNG con hash SHA-256 para trazabilidad. Si no dibujas firma, se registrará solo el nombre y rol.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={registerSignatureMut.isPending || !signerName.trim()}>
            <Upload className="w-4 h-4 mr-2" />
            {registerSignatureMut.isPending ? "Guardando..." : "Registrar firma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
