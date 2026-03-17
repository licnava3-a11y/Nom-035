import { useState } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { FileText, Download, Loader2, Eye } from 'lucide-react';

type AnalysisLevel = 'organizational' | 'group' | 'personal';

export default function RegulatoryReports() {
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [analysisLevel, setAnalysisLevel] = useState<AnalysisLevel>('organizational');
  const [selectedSigners, setSelectedSigners] = useState<number[]>([]);
  const [conclusions, setConclusions] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [groupFilters, setGroupFilters] = useState({
    departmentId: null as number | null,
    ageRange: null as string | null,
    gender: null as string | null,
    positionId: null as number | null,
  });

  // Queries
  const { data: periods, isLoading: loadingPeriods } = trpc.reports.getAvailablePeriods.useQuery();
  const { data: signers, isLoading: loadingSigners } = trpc.reports.getAvailableSigners.useQuery();

  // Mutation
  const generateReport = trpc.reports.generateNom035Report.useMutation({
    onSuccess: (data) => {
      toast.success('Informe generado exitosamente');
      window.open(data.pdfUrl, '_blank');
    },
    onError: (error) => {
      toast.error(`Error al generar informe: ${error.message}`);
    },
  });

  const handleGenerateReport = () => {
    if (!selectedPeriod) {
      toast.error('Selecciona un período de aplicación');
      return;
    }

    if (selectedSigners.length < 2) {
      toast.error('Selecciona al menos 2 firmantes');
      return;
    }

    if (conclusions.length < 50) {
      toast.error('Las conclusiones deben tener al menos 50 caracteres');
      return;
    }

    if (recommendations.length < 50) {
      toast.error('Las recomendaciones deben tener al menos 50 caracteres');
      return;
    }

    generateReport.mutate({
      periodId: selectedPeriod,
      signerIds: selectedSigners,
      conclusions,
      recommendations,
    });
  };

  const toggleSigner = (signerId: number) => {
    setSelectedSigners(prev =>
      prev.includes(signerId)
        ? prev.filter(id => id !== signerId)
        : [...prev, signerId]
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: 'Reportes y Análisis', href: '/reports' },
          { label: 'Reportes Normativos' },
        ]}
      />

      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Reportes Normativos NOM-035</h1>
          <p className="text-muted-foreground">
            Generación de Informe Numeral 7.5 con análisis multinivel
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulario de Configuración */}
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Configuración del Informe</h2>
          </div>

          {/* Período de Aplicación */}
          <div className="space-y-2">
            <Label htmlFor="period">Período de Aplicación *</Label>
            <Select
              value={selectedPeriod?.toString() || ''}
              onValueChange={(value) => setSelectedPeriod(parseInt(value))}
            >
              <SelectTrigger id="period">
                <SelectValue placeholder="Selecciona un período" />
              </SelectTrigger>
              <SelectContent>
                {loadingPeriods ? (
                  <SelectItem value="loading" disabled>
                    Cargando períodos...
                  </SelectItem>
                ) : periods && periods.length > 0 ? (
                  periods.map((period: any) => (
                    <SelectItem key={period.id} value={period.id.toString()}>
                      {period.year} - {period.description || 'Sin descripción'}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="empty" disabled>
                    No hay períodos disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Nivel de Análisis */}
          <div className="space-y-2">
            <Label htmlFor="analysis-level">Nivel de Análisis *</Label>
            <Select
              value={analysisLevel}
              onValueChange={(value: AnalysisLevel) => setAnalysisLevel(value)}
            >
              <SelectTrigger id="analysis-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organizational">
                  Nivel 1: Organizacional (Toda la empresa)
                </SelectItem>
                <SelectItem value="group">
                  Nivel 2: Grupal (Por segmentos, departamentos, filtros)
                </SelectItem>
                <SelectItem value="personal">
                  Nivel 3: Personal (Individual)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtros Grupales (solo si nivel = group) */}
          {analysisLevel === 'group' && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium">Filtros Grupales</h3>
              
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Select
                  value={groupFilters.departmentId?.toString() || ''}
                  onValueChange={(value) =>
                    setGroupFilters(prev => ({ ...prev, departmentId: parseInt(value) }))
                  }
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Todos los departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {/* Aquí se cargarían los departamentos desde la BD */}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age-range">Rango de Edad</Label>
                <Select
                  value={groupFilters.ageRange || ''}
                  onValueChange={(value) =>
                    setGroupFilters(prev => ({ ...prev, ageRange: value }))
                  }
                >
                  <SelectTrigger id="age-range">
                    <SelectValue placeholder="Todos los rangos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="18-25">18-25 años</SelectItem>
                    <SelectItem value="26-35">26-35 años</SelectItem>
                    <SelectItem value="36-45">36-45 años</SelectItem>
                    <SelectItem value="46-55">46-55 años</SelectItem>
                    <SelectItem value="56+">56+ años</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <Select
                  value={groupFilters.gender || ''}
                  onValueChange={(value) =>
                    setGroupFilters(prev => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Conclusiones */}
          <div className="space-y-2">
            <Label htmlFor="conclusions">
              Conclusiones * (mínimo 50 caracteres)
            </Label>
            <Textarea
              id="conclusions"
              value={conclusions}
              onChange={(e) => setConclusions(e.target.value)}
              placeholder="Redacta las conclusiones del análisis realizado..."
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              {conclusions.length}/50 caracteres
            </p>
          </div>

          {/* Recomendaciones */}
          <div className="space-y-2">
            <Label htmlFor="recommendations">
              Recomendaciones * (mínimo 50 caracteres)
            </Label>
            <Textarea
              id="recommendations"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Redacta las recomendaciones para mitigar los factores de riesgo identificados..."
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              {recommendations.length}/50 caracteres
            </p>
          </div>
        </Card>

        {/* Selección de Firmantes */}
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Firmantes Autorizados</h2>
            <p className="text-sm text-muted-foreground">
              Selecciona al menos 2 firmantes para validar el informe
            </p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loadingSigners ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : signers && signers.length > 0 ? (
              signers.map((signer: any) => (
                <div
                  key={signer.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`signer-${signer.id}`}
                    checked={selectedSigners.includes(signer.id)}
                    onCheckedChange={() => toggleSigner(signer.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`signer-${signer.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {signer.name}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {signer.position || 'Sin cargo especificado'}
                    </p>
                    {!signer.hasSignature && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Sin firma digital registrada
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay firmantes disponibles
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Firmantes seleccionados: {selectedSigners.length}/2 mínimo
            </p>

            <div className="flex gap-3">
              <Button
                onClick={handleGenerateReport}
                disabled={generateReport.isPending}
                className="flex-1"
              >
                {generateReport.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generar Informe PDF
                  </>
                )}
              </Button>

              <Button variant="outline" disabled>
                <Eye className="mr-2 h-4 w-4" />
                Vista Previa
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Información Adicional */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">Información del Informe</h3>
        <div className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Formato:</span>
            <span className="font-medium">PDF (Hoja Carta)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Normativa:</span>
            <span className="font-medium">NOM-035-STPS-2018 Numeral 7.5</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Validación:</span>
            <span className="font-medium">Código QR NOM-151</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Firmas:</span>
            <span className="font-medium">Digitales integradas</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
