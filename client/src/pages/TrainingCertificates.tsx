import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Award, Download, FileText, Search, Calendar, PenTool } from 'lucide-react';
import SignatureCanvas from '@/components/SignatureCanvas';
// import { useToast } from '@/hooks/use-toast';

export default function TrainingCertificates() {
  // const { toast } = useToast();
  const toast = ({ title, description, variant }: any) => {
    if (variant === 'destructive') {
      alert(`Error: ${title}\n${description}`);
    } else {
      alert(`${title}\n${description}`);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showInstructorSignature, setShowInstructorSignature] = useState(false);
  const [showRepresentativeSignature, setShowRepresentativeSignature] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    courseId: 0,
    courseName: '',
    completionDate: new Date().toISOString().split('T')[0],
    durationHours: 0,
    grade: '',
    instructorName: '',
    instructorSignatureUrl: '',
    representativeName: '',
    representativeSignatureUrl: '',
  });

  // Queries
  const { data: employees, isLoading: loadingEmployees } = trpc.employees.list.useQuery();
  // TODO: Implementar procedimiento getReportHistory en compliance router
  // const { data: certificates, isLoading: loadingCertificates, refetch } = trpc.compliance.getReportHistory.useQuery();
  const certificates: any[] = [];
  const loadingCertificates = false;
  const refetch = () => {};

  // Mutation
  const generateCertificate = trpc.compliance.generateTrainingCertificatePDF.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Certificado generado',
        description: `Folio: ${data.data.folio}`,
      });

      // Descargar PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.pdfBase64}`;
      link.download = `Certificado_${data.data.folio}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsGenerating(false);
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsGenerating(false);
    },
  });

  // Mutation para subir firmas
  const uploadSignature = trpc.compliance.uploadSignature.useMutation({
    onSuccess: (data, variables) => {
      // Determinar si es firma de instructor o representante
      if (variables.signerName === formData.instructorName) {
        setFormData({ ...formData, instructorSignatureUrl: data.signatureUrl });
        setShowInstructorSignature(false);
      } else if (variables.signerName === formData.representativeName) {
        setFormData({ ...formData, representativeSignatureUrl: data.signatureUrl });
        setShowRepresentativeSignature(false);
      }
      alert('Firma guardada exitosamente');
    },
    onError: (error) => {
      alert(`Error al guardar firma: ${error.message}`);
    },
  });

  const handleSaveInstructorSignature = (signatureDataUrl: string) => {
    if (!formData.instructorName) {
      alert('Ingresa el nombre del instructor primero');
      return;
    }
    uploadSignature.mutate({
      signatureDataUrl,
      signerName: formData.instructorName,
    });
  };

  const handleSaveRepresentativeSignature = (signatureDataUrl: string) => {
    if (!formData.representativeName) {
      alert('Ingresa el nombre del representante primero');
      return;
    }
    uploadSignature.mutate({
      signatureDataUrl,
      signerName: formData.representativeName,
    });
  };

  const handleGenerateCertificate = () => {
    if (!selectedEmployee) {
      toast({
        title: 'Error',
        description: 'Selecciona un empleado',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.courseName || !formData.durationHours || !formData.grade || !formData.instructorName || !formData.representativeName) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    generateCertificate.mutate({
      employeeId: selectedEmployee,
      ...formData,
    });
  };

  const filteredEmployees = employees?.filter(emp =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const certificateHistory = certificates?.filter(cert => cert.tipo === 'certificado_capacitacion') || [];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Award className="h-8 w-8" />
          Certificados de Capacitación
        </h1>
        <p className="text-muted-foreground mt-2">
          Genera certificados oficiales de capacitación con cumplimiento STPS y RED CONOCER
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel de generación */}
        <Card>
          <CardHeader>
            <CardTitle>Generar Nuevo Certificado</CardTitle>
            <CardDescription>
              Selecciona un empleado y completa la información del curso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Búsqueda de empleado */}
              <div>
                <Label>Buscar Empleado</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre o correo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Lista de empleados */}
              {searchTerm && (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {loadingEmployees ? (
                    <div className="p-4 text-center text-muted-foreground">Cargando...</div>
                  ) : filteredEmployees && filteredEmployees.length > 0 ? (
                    <div className="divide-y">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => {
                            setSelectedEmployee(emp.id);
                            setSearchTerm(`${emp.firstName} ${emp.lastName}`);
                          }}
                          className={`w-full p-3 text-left hover:bg-accent transition-colors ${
                            selectedEmployee === emp.id ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                          <div className="text-sm text-muted-foreground">{emp.email}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">No se encontraron empleados</div>
                  )}
                </div>
              )}

              {/* Botón para abrir diálogo */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" disabled={!selectedEmployee}>
                    <FileText className="mr-2 h-4 w-4" />
                    Completar Información del Curso
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Información del Curso</DialogTitle>
                    <DialogDescription>
                      Completa los datos del curso de capacitación
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="courseName">Nombre del Curso *</Label>
                        <Input
                          id="courseName"
                          value={formData.courseName}
                          onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                          placeholder="Ej: NOM-035 Implementación"
                        />
                      </div>
                      <div>
                        <Label htmlFor="courseId">ID del Curso</Label>
                        <Input
                          id="courseId"
                          type="number"
                          value={formData.courseId}
                          onChange={(e) => setFormData({ ...formData, courseId: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="completionDate">Fecha de Conclusión *</Label>
                        <Input
                          id="completionDate"
                          type="date"
                          value={formData.completionDate}
                          onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="durationHours">Duración (horas) *</Label>
                        <Input
                          id="durationHours"
                          type="number"
                          value={formData.durationHours}
                          onChange={(e) => setFormData({ ...formData, durationHours: parseInt(e.target.value) || 0 })}
                          placeholder="40"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="grade">Calificación *</Label>
                      <Input
                        id="grade"
                        value={formData.grade}
                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                        placeholder="Ej: 95/100 o Aprobado"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Instructor</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="instructorName">Nombre del Instructor *</Label>
                          <Input
                            id="instructorName"
                            value={formData.instructorName}
                            onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
                            placeholder="Nombre completo"
                          />
                        </div>
                        <div>
                          <Label>Firma Digital</Label>
                          {formData.instructorSignatureUrl ? (
                            <div className="space-y-2">
                              <div className="border rounded-lg p-2 bg-gray-50">
                                <img src={formData.instructorSignatureUrl} alt="Firma instructor" className="h-20 mx-auto" />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setShowInstructorSignature(true)}
                              >
                                <PenTool className="mr-2 h-4 w-4" />
                                Cambiar Firma
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => setShowInstructorSignature(true)}
                            >
                              <PenTool className="mr-2 h-4 w-4" />
                              Capturar Firma Digital
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Representante Legal</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="representativeName">Nombre del Representante *</Label>
                          <Input
                            id="representativeName"
                            value={formData.representativeName}
                            onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                            placeholder="Nombre completo"
                          />
                        </div>
                        <div>
                          <Label>Firma Digital</Label>
                          {formData.representativeSignatureUrl ? (
                            <div className="space-y-2">
                              <div className="border rounded-lg p-2 bg-gray-50">
                                <img src={formData.representativeSignatureUrl} alt="Firma representante" className="h-20 mx-auto" />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setShowRepresentativeSignature(true)}
                              >
                                <PenTool className="mr-2 h-4 w-4" />
                                Cambiar Firma
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => setShowRepresentativeSignature(true)}
                            >
                              <PenTool className="mr-2 h-4 w-4" />
                              Capturar Firma Digital
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleGenerateCertificate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>Generando...</>
                      ) : (
                        <>
                          <Award className="mr-2 h-4 w-4" />
                          Generar Certificado
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Panel de historial */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Certificados</CardTitle>
            <CardDescription>
              Certificados emitidos recientemente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCertificates ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : certificateHistory.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {certificateHistory.slice(0, 10).map((cert: any) => (
                  <div
                    key={cert.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{cert.titulo}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Folio: {cert.folio}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(cert.createdAt).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay certificados emitidos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla completa de certificados */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Todos los Certificados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCertificates ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : certificateHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Generado Por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificateHistory.map((cert: any) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-sm">{cert.folio}</TableCell>
                    <TableCell>{cert.titulo}</TableCell>
                    <TableCell>{cert.generatedByName}</TableCell>
                    <TableCell>
                      {new Date(cert.createdAt).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay certificados emitidos
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de firma del instructor */}
      {showInstructorSignature && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <SignatureCanvas
            onSave={handleSaveInstructorSignature}
            onCancel={() => setShowInstructorSignature(false)}
          />
        </div>
      )}

      {/* Modal de firma del representante */}
      {showRepresentativeSignature && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <SignatureCanvas
            onSave={handleSaveRepresentativeSignature}
            onCancel={() => setShowRepresentativeSignature(false)}
          />
        </div>
      )}
    </div>
  );
}
