/**
 * Página de Autodiagnóstico NOM-035
 * Checklist interactivo de 45 requisitos normativos
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  ClipboardCheck, 
  Upload, 
  Save, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function AutodiagnosticoPage() {
  const [currentAutodiagnosticoId, setCurrentAutodiagnosticoId] = useState<number | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<{
    id: number;
    requirementId: number;
    codigo: string;
    descripcion: string;
    cumple: boolean;
    observaciones: string | null;
  } | null>(null);
  const [observacionesDialog, setObservacionesDialog] = useState('');
  const [uploadDialog, setUploadDialog] = useState<{ open: boolean; evidenceId: number | null }>({
    open: false,
    evidenceId: null,
  });

  // Queries
  const { data: requirements } = trpc.autodiagnostico.getRequirements.useQuery();
  const { data: autodiagnosticos, refetch: refetchAutodiagnosticos } = trpc.autodiagnostico.getAll.useQuery();
  const { data: currentAutodiagnostico, refetch: refetchCurrent } = trpc.autodiagnostico.getById.useQuery(
    { id: currentAutodiagnosticoId! },
    { enabled: !!currentAutodiagnosticoId }
  );

  // Mutations
  const createMutation = trpc.autodiagnostico.create.useMutation({
    onSuccess: (data) => {
      toast.success('Autodiagnóstico creado exitosamente');
      setCurrentAutodiagnosticoId(data.id);
      refetchAutodiagnosticos();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateEvidenceMutation = trpc.autodiagnostico.updateEvidence.useMutation({
    onSuccess: () => {
      toast.success('Evidencia actualizada');
      refetchCurrent();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const uploadEvidenceMutation = trpc.autodiagnostico.uploadEvidence.useMutation({
    onSuccess: () => {
      toast.success('Archivo subido exitosamente');
      refetchCurrent();
      setUploadDialog({ open: false, evidenceId: null });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Auto-seleccionar el último autodiagnóstico
  useEffect(() => {
    if (autodiagnosticos && autodiagnosticos.length > 0 && !currentAutodiagnosticoId) {
      setCurrentAutodiagnosticoId(autodiagnosticos[0].id);
    }
  }, [autodiagnosticos, currentAutodiagnosticoId]);

  const handleCreateNew = () => {
    createMutation.mutate();
  };

  const handleToggleEvidence = (evidenceId: number, currentValue: boolean) => {
    updateEvidenceMutation.mutate({
      evidenceId,
      cumple: !currentValue,
    });
  };

  const handleOpenObservaciones = (evidence: any) => {
    setSelectedEvidence({
      id: evidence.evidence.id,
      requirementId: evidence.requirement.id,
      codigo: evidence.requirement.codigo,
      descripcion: evidence.requirement.descripcion,
      cumple: evidence.evidence.cumple,
      observaciones: evidence.evidence.observaciones,
    });
    setObservacionesDialog(evidence.evidence.observaciones || '');
  };

  const handleSaveObservaciones = () => {
    if (!selectedEvidence) return;

    updateEvidenceMutation.mutate({
      evidenceId: selectedEvidence.id,
      cumple: selectedEvidence.cumple,
      observaciones: observacionesDialog,
    });

    setSelectedEvidence(null);
    setObservacionesDialog('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadDialog.evidenceId) return;

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (!base64) return;

      if (uploadDialog.evidenceId) {
        uploadEvidenceMutation.mutate({
          evidenceId: uploadDialog.evidenceId,
          fileName: file.name,
          fileContent: base64,
          mimeType: file.type,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const getCategoryProgress = (categoria: number): number => {
    if (!currentAutodiagnostico) return 0;
    const fieldName = `porcentajeCategoria${categoria}` as keyof typeof currentAutodiagnostico.autodiagnostico;
    const value = currentAutodiagnostico.autodiagnostico[fieldName];
    return typeof value === 'string' ? parseFloat(value) : 0;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 85) return 'bg-green-600';
    if (percentage >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getProgressBadge = (percentage: number) => {
    if (percentage >= 85) return <Badge className="bg-green-600">Cumplimiento Alto</Badge>;
    if (percentage >= 60) return <Badge className="bg-yellow-600">Cumplimiento Medio</Badge>;
    return <Badge className="bg-red-600">Cumplimiento Bajo</Badge>;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Autodiagnóstico NOM-035
          </h1>
          <p className="text-muted-foreground mt-2">
            Evaluación de cumplimiento de requisitos normativos
          </p>
        </div>
        <Button onClick={handleCreateNew} disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creando...' : 'Nuevo Autodiagnóstico'}
        </Button>
      </div>

      {/* Selector de autodiagnóstico */}
      {autodiagnosticos && autodiagnosticos.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Autodiagnóstico Actual</Label>
              <p className="text-sm text-muted-foreground">
                Creado: {new Date(autodiagnosticos[0].createdAt).toLocaleDateString('es-MX')}
              </p>
            </div>
            {currentAutodiagnostico && (
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {currentAutodiagnostico.autodiagnostico.porcentajeTotal}%
                </div>
                {getProgressBadge(parseFloat(currentAutodiagnostico.autodiagnostico.porcentajeTotal || '0'))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Checklist de requisitos */}
      {currentAutodiagnostico && requirements && (
        <Accordion type="multiple" className="space-y-4">
          {[1, 2, 3, 4, 5].map((categoria) => {
            const categoryReqs = requirements.byCategory[categoria] || [];
            const categoryProgress = getCategoryProgress(categoria);
            const categoryName = categoryReqs[0]?.categoriaNombre || `Categoría ${categoria}`;

            return (
              <AccordionItem key={categoria} value={`categoria-${categoria}`} className="border rounded-lg">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <h3 className="font-bold text-lg">{categoryName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {categoryReqs.length} requisitos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <Progress 
                          value={categoryProgress} 
                          className="h-2"
                        />
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="font-bold">{categoryProgress.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-3 mt-4">
                    {categoryReqs.map((req) => {
                      const evidence = currentAutodiagnostico.evidences.find(
                        (e) => e.requirement?.id === req.id
                      );

                      return (
                        <Card key={req.id} className="p-4">
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={evidence?.evidence.cumple || false}
                              onCheckedChange={() => evidence && handleToggleEvidence(evidence.evidence.id, evidence.evidence.cumple)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{req.codigo}</Badge>
                                {req.articuloNOM && (
                                  <Badge variant="secondary">Art. {req.articuloNOM}</Badge>
                                )}
                              </div>
                              <p className="text-sm">{req.descripcion}</p>
                              {evidence?.evidence.observaciones && (
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  Observaciones: {evidence.evidence.observaciones}
                                </p>
                              )}
                              {evidence?.evidence.evidenciaUrl && (
                                <div className="flex items-center gap-2 mt-2">
                                  <FileText className="h-4 w-4 text-green-600" />
                                  <a 
                                    href={evidence.evidence.evidenciaUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    {evidence.evidence.evidenciaNombre || 'Ver evidencia'}
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenObservaciones(evidence)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setUploadDialog({ open: true, evidenceId: evidence!.evidence.id })}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Dialog de Observaciones */}
      <Dialog open={!!selectedEvidence} onOpenChange={(open) => !open && setSelectedEvidence(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observaciones</DialogTitle>
            <DialogDescription>
              {selectedEvidence?.codigo}: {selectedEvidence?.descripcion}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                placeholder="Ingresa observaciones sobre este requisito..."
                value={observacionesDialog}
                onChange={(e) => setObservacionesDialog(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvidence(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveObservaciones} disabled={updateEvidenceMutation.isPending}>
              {updateEvidenceMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Upload */}
      <Dialog open={uploadDialog.open} onOpenChange={(open) => setUploadDialog({ open, evidenceId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Evidencia</DialogTitle>
            <DialogDescription>
              Selecciona un archivo para adjuntar como evidencia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog({ open: false, evidenceId: null })}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
