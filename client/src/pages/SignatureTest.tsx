import { useState } from 'react';
import { SignaturePad } from '@/components/SignaturePad';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

import { CheckCircle2, XCircle } from 'lucide-react';

/**
 * Página de prueba para el componente SignaturePad
 * 
 * Permite probar:
 * - Captura de firma táctil
 * - Conversión a PNG/base64
 * - Subida a S3
 * - Almacenamiento en base de datos
 * - Visualización de firmas guardadas
 */
export default function SignatureTest() {

  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [savedSignatureUrl, setSavedSignatureUrl] = useState<string | null>(null);
  const [testDocumentId] = useState(1); // ID de documento de prueba

  // Mutation para guardar firma
  const saveSignatureMutation = trpc.signatures.saveSignature.useMutation({
    onSuccess: (data) => {
      alert('Firma guardada exitosamente');
      setSavedSignatureUrl(data.signatureUrl);
      setShowSignaturePad(false);
    },
    onError: (error) => {
      alert(`Error al guardar firma: ${error.message}`);
    },
  });

  // Query para obtener firmas del documento
  const { data: signatures, refetch } = trpc.signatures.getSignaturesByDocument.useQuery(
    { documentId: testDocumentId },
    { enabled: false } // No cargar automáticamente
  );

  const handleSaveSignature = (signatureDataUrl: string) => {
    saveSignatureMutation.mutate({
      documentId: testDocumentId,
      signatureDataUrl,
      signerName: 'Usuario de Prueba',
      signerRole: 'Probador',
    });
  };

  const handleLoadSignatures = () => {
    refetch();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Prueba de Firma Digitalizada</h1>
        <p className="text-muted-foreground">
          Componente de prueba para validar la captura, conversión y almacenamiento de firmas digitales
        </p>
      </div>

      {/* Instrucciones */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <h2 className="text-lg font-semibold mb-3">Instrucciones de Prueba</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Haz clic en "Abrir Panel de Firma" para mostrar el componente SignaturePad</li>
          <li>Firma en el área designada usando mouse o pantalla táctil</li>
          <li>Haz clic en "Guardar Firma" para subir a S3 y guardar en base de datos</li>
          <li>Verifica que la firma se muestre correctamente en la sección de "Firma Guardada"</li>
          <li>Haz clic en "Cargar Firmas del Documento" para ver todas las firmas asociadas</li>
        </ol>
      </Card>

      {/* Botones de acción */}
      <div className="flex gap-4">
        <Button
          onClick={() => setShowSignaturePad(!showSignaturePad)}
          variant={showSignaturePad ? 'outline' : 'default'}
        >
          {showSignaturePad ? 'Ocultar' : 'Abrir'} Panel de Firma
        </Button>
        <Button onClick={handleLoadSignatures} variant="outline">
          Cargar Firmas del Documento
        </Button>
      </div>

      {/* Componente SignaturePad */}
      {showSignaturePad && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <SignaturePad
            onSave={handleSaveSignature}
            onCancel={() => setShowSignaturePad(false)}
            signerName="Usuario de Prueba"
            signerRole="Probador"
          />
        </div>
      )}

      {/* Firma guardada */}
      {savedSignatureUrl && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold">Firma Guardada Exitosamente</h2>
          </div>
          <div className="border-2 border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-950">
            <img
              src={savedSignatureUrl}
              alt="Firma guardada"
              className="max-w-full h-auto"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">URL de la firma:</p>
            <p className="break-all">{savedSignatureUrl}</p>
          </div>
        </Card>
      )}

      {/* Lista de firmas del documento */}
      {signatures && signatures.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            Firmas del Documento (Total: {signatures.length})
          </h2>
          <div className="space-y-4">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{sig.signerName}</p>
                    {sig.signerRole && (
                      <p className="text-sm text-muted-foreground">{sig.signerRole}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sig.signedAt).toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="border rounded p-2 bg-white dark:bg-gray-900">
                  <img
                    src={sig.signatureImageUrl}
                    alt={`Firma de ${sig.signerName}`}
                    className="max-w-full h-auto"
                  />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>IP: {sig.ipAddress || 'No disponible'}</p>
                  <p className="truncate">Dispositivo: {sig.deviceInfo || 'No disponible'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Estado sin firmas */}
      {signatures && signatures.length === 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <XCircle className="w-5 h-5" />
            <p>No hay firmas guardadas para este documento</p>
          </div>
        </Card>
      )}
    </div>
  );
}
