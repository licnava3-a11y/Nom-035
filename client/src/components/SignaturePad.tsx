import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eraser, Save, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel?: () => void;
  signerName?: string;
  signerRole?: string;
  width?: number;
  height?: number;
}

/**
 * Componente de captura de firma digitalizada
 * 
 * Características:
 * - Captura táctil mediante canvas HTML5
 * - Conversión automática a PNG/base64
 * - Detección de dispositivo táctil
 * - Validación de firma no vacía
 * - Responsive y accesible
 * 
 * @param onSave - Callback con la firma en formato data URL (base64)
 * @param onCancel - Callback opcional para cancelar
 * @param signerName - Nombre del firmante (opcional, para mostrar)
 * @param signerRole - Rol del firmante (opcional, para mostrar)
 * @param width - Ancho del canvas (default: 500)
 * @param height - Alto del canvas (default: 200)
 */
export function SignaturePad({
  onSave,
  onCancel,
  signerName,
  signerRole,
  width = 500,
  height = 200,
}: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detectar si el dispositivo soporta touch
    const hasTouchSupport =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - msMaxTouchPoints es específico de IE
      navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(hasTouchSupport);
  }, []);

  const handleClear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      // Obtener la firma como data URL (PNG base64)
      const signatureDataUrl = sigPadRef.current.toDataURL('image/png');
      onSave(signatureDataUrl);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

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
            width,
            height,
            className: 'signature-canvas',
            style: { width: '100%', height: 'auto' },
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
      </div>
    </Card>
  );
}
