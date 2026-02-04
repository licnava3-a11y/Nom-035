import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eraser, Save, X, Edit } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel?: () => void;
  signerName?: string;
  signerRole?: string;
  initialSignature?: string; // Para mostrar firma existente
}

/**
 * Componente de captura de firma digitalizada con mejoras
 * 
 * Características:
 * - Canvas responsive que se ajusta al contenedor
 * - Vista previa de firma guardada
 * - Compresión automática de imagen (300x120px)
 * - Opción de editar/reemplazar firma
 * - Conversión automática a PNG/base64
 * - Detección de dispositivo táctil
 * - Validación de firma no vacía
 * 
 * @param onSave - Callback con la firma en formato data URL (base64 comprimido)
 * @param onCancel - Callback opcional para cancelar
 * @param signerName - Nombre del firmante (opcional, para mostrar)
 * @param signerRole - Rol del firmante (opcional, para mostrar)
 * @param initialSignature - Firma existente para mostrar (opcional)
 */
export function SignaturePad({
  onSave,
  onCancel,
  signerName,
  signerRole,
  initialSignature,
}: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 200 });
  const [savedSignature, setSavedSignature] = useState<string | null>(initialSignature || null);
  const [isEditing, setIsEditing] = useState(!initialSignature);

  useEffect(() => {
    // Detectar si el dispositivo soporta touch
    const hasTouchSupport =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - msMaxTouchPoints es específico de IE
      navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(hasTouchSupport);
  }, []);

  useEffect(() => {
    // Ajustar tamaño del canvas según el contenedor
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Mantener aspect ratio 5:2 (500x200)
        const width = Math.min(containerWidth - 32, 500); // -32 para padding
        const height = width * 0.4; // Mantener proporción
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();

    // Usar ResizeObserver para detectar cambios de tamaño
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleClear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      setIsEmpty(true);
    }
  };

  const compressSignature = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Crear canvas temporal para compresión
        const canvas = document.createElement('canvas');
        const targetWidth = 300;
        const targetHeight = 120;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fondo blanco
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          
          // Dibujar imagen escalada
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }
        
        // Convertir a PNG con calidad optimizada
        resolve(canvas.toDataURL('image/png', 0.8));
      };
      img.src = dataUrl;
    });
  };

  const handleSave = async () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      // Obtener la firma como data URL (PNG base64)
      const signatureDataUrl = sigPadRef.current.toDataURL('image/png');
      
      // Comprimir la imagen
      const compressedSignature = await compressSignature(signatureDataUrl);
      
      // Guardar en estado local para vista previa
      setSavedSignature(compressedSignature);
      setIsEditing(false);
      
      // Llamar callback con firma comprimida
      onSave(compressedSignature);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSavedSignature(null);
    handleClear();
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  // Si hay firma guardada y no está en modo edición, mostrar vista previa
  if (savedSignature && !isEditing) {
    return (
      <Card className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Firma Digitalizada</h3>
          {signerName && (
            <p className="text-sm text-muted-foreground">
              Firmante: <span className="font-medium">{signerName}</span>
              {signerRole && ` - ${signerRole}`}
            </p>
          )}
        </div>

        {/* Vista previa de firma */}
        <div className="border-2 border-border rounded-lg overflow-hidden bg-white p-4">
          <img 
            src={savedSignature} 
            alt="Firma guardada" 
            className="w-full h-auto max-w-md mx-auto"
          />
        </div>

        {/* Botón de editar */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            ✓ Firma guardada exitosamente
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar Firma
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Modo de edición/captura
  return (
    <Card className="p-6 space-y-4" ref={containerRef}>
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Firma Digitalizada</h3>
        {signerName && (
          <p className="text-sm text-muted-foreground">
            Firmante: <span className="font-medium">{signerName}</span>
            {signerRole && ` - ${signerRole}`}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {isTouchDevice
            ? 'Firme con su dedo o stylus en el área de abajo'
            : 'Firme con el mouse en el área de abajo'}
        </p>
      </div>

      {/* Canvas de firma */}
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            width: canvasSize.width,
            height: canvasSize.height,
            className: 'signature-canvas w-full',
          }}
          backgroundColor="rgb(255, 255, 255)"
          penColor="rgb(0, 0, 0)"
          minWidth={0.5}
          maxWidth={2.5}
          velocityFilterWeight={0.7}
          onBegin={handleBegin}
        />
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={isEmpty}
        >
          <Eraser className="w-4 h-4 mr-2" />
          Limpiar
        </Button>

        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isEmpty}
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Firma
          </Button>
        </div>
      </div>

      {/* Información de trazabilidad */}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        <p>
          Al guardar su firma, se registrará la fecha, hora, dirección IP y
          dispositivo utilizado para fines de trazabilidad y cumplimiento de la
          NOM-151-SCFI-2016.
        </p>
        <p className="mt-1">
          La firma se optimiza automáticamente a 300x120px para reducir el tamaño del documento.
        </p>
      </div>
    </Card>
  );
}
