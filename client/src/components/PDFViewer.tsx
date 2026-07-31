import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ZoomIn, ZoomOut, RotateCw, Loader2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface PDFViewerProps {
  /** Si el modal está abierto */
  open: boolean;
  /** Callback para cerrar el modal (puede ser función simple o setter de estado) */
  onClose?: () => void;
  /** Alternativa a onClose para compatibilidad con Dialog de shadcn/ui */
  onOpenChange?: ((open: boolean) => void) | Dispatch<SetStateAction<boolean>>;
  /** base64 del PDF a mostrar */
  pdfBase64?: string;
  /** URL pública del PDF (alternativa a base64) */
  pdfUrl?: string;
  /** Nombre del archivo para la descarga */
  filename?: string;
  /** Título del modal */
  title?: string;
  /** Si se está cargando el PDF */
  loading?: boolean;
}

export function PDFViewer({
  open,
  onClose,
  onOpenChange,
  pdfBase64,
  pdfUrl,
  filename = "documento.pdf",
  title = "Vista previa del documento",
  loading = false,
}: PDFViewerProps) {
  const [zoom, setZoom] = useState(100);

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  // Construir la URL del iframe — base64 tiene prioridad
  const iframeSrc = pdfBase64
    ? `data:application/pdf;base64,${pdfBase64}`
    : pdfUrl ?? "";

  const handleDownload = () => {
    if (!iframeSrc) return;
    const a = document.createElement("a");
    a.href = iframeSrc;
    a.download = filename;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold truncate pr-4">
              {title}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {/* Controles de zoom */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                title="Reducir zoom"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                title="Aumentar zoom"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(100)}
                title="Restablecer zoom"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              {/* Descargar */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                disabled={!iframeSrc || loading}
                title="Descargar PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
              {/* Cerrar */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido del visor */}
        <div className="flex-1 overflow-hidden bg-muted/30 relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generando documento...</p>
            </div>
          ) : !iframeSrc ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted-foreground">No hay documento disponible</p>
            </div>
          ) : (
            <div
              className="w-full h-full overflow-auto flex justify-center"
              style={{ padding: "16px" }}
            >
              <iframe
                src={iframeSrc}
                title={title}
                style={{
                  width: `${zoom}%`,
                  height: "100%",
                  minHeight: "600px",
                  border: "none",
                  borderRadius: "4px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  background: "white",
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 py-3 border-t flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-muted-foreground">{filename}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cerrar
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={!iframeSrc || loading}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PDFViewer;
