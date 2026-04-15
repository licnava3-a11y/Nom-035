import { useState, useRef } from "react";
import { useLocation, useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReentryBadge } from "@/components/ReentryBadge";
import { EmployeeTimeline } from "@/components/EmployeeTimeline";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  FileText,
  Edit,
  UserX,
  UserCheck,
  FolderOpen,
  Target,
  Download,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Upload,
  Trash2,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Helper: contract expiration status
function contractStatus(dateStr: string | null | undefined): { label: string; color: string; icon: React.ReactNode; daysLeft: number | null } {
  if (!dateStr) return { label: "Sin fecha", color: "text-muted-foreground", icon: null, daysLeft: null };
  const expDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: `Vencido hace ${Math.abs(daysLeft)} días`, color: "text-red-600", icon: <XCircle className="h-4 w-4 text-red-500" />, daysLeft };
  if (daysLeft <= 7) return { label: `Vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`, color: "text-red-600", icon: <AlertTriangle className="h-4 w-4 text-red-500" />, daysLeft };
  if (daysLeft <= 30) return { label: `Vence en ${daysLeft} días`, color: "text-amber-600", icon: <Clock className="h-4 w-4 text-amber-500" />, daysLeft };
  return { label: `Vigente (${daysLeft} días)`, color: "text-green-600", icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, daysLeft };
}

const DOC_LABELS: Record<string, string> = {
  ine: "INE / Identificación Oficial",
  curp_document: "CURP",
  rfc_document: "RFC",
  nss_document: "NSS (IMSS)",
  birth_certificate: "Acta de Nacimiento",
  proof_of_address: "Comprobante de Domicilio",
  contract: "Contrato de Trabajo",
  job_offer: "Oferta de Empleo",
  resignation: "Carta de Renuncia",
  termination: "Finiquito / Baja",
  recommendation: "Carta de Recomendación",
  diploma: "Título / Diploma",
  certificate: "Certificado / Constancia",
  medical_exam: "Examen Médico",
  background_check: "Estudio Socioeconómico",
  other: "Otro Documento",
};

const REQUIRED_DOCS = ["ine", "curp_document", "rfc_document", "nss_document", "birth_certificate", "contract"];

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const employeeId = parseInt(id || "0");
  const [activeTab, setActiveTab] = useState<"info" | "dnc" | "contracts" | "docs">("info");
  const [uploadType, setUploadType] = useState<string>("ine");
  const [uploadNotes, setUploadNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: employee, isLoading, refetch } = trpc.employees.getById.useQuery(
    { id: employeeId },
    { enabled: employeeId > 0 }
  ) as { data: any; isLoading: boolean; refetch: () => void };
  const { data: employeeHistory } = trpc.employees.getHistory.useQuery(
    { employeeId },
    { enabled: employeeId > 0 }
  );
  const { data: coursesHistory } = trpc.employees.getCoursesHistory.useQuery(
    { employeeId },
    { enabled: employeeId > 0 }
  );
  const { data: profileComparison, isLoading: dncLoading, refetch: refetchDNC } = trpc.jobProfiles.getProfileComparison.useQuery(
    { employeeId },
    { enabled: employeeId > 0 && activeTab === "dnc" }
  );
  const { data: empDocuments, isLoading: docsLoading, refetch: refetchDocs } = trpc.employeeDocuments.list.useQuery(
    { employeeId },
    { enabled: employeeId > 0 && activeTab === "docs" }
  );
  const { data: docStats } = trpc.employeeDocuments.getStats.useQuery(
    { employeeId },
    { enabled: employeeId > 0 && activeTab === "docs" }
  );

  const generateDNCMutation = trpc.jobProfiles.generateDNC.useMutation({
    onSuccess: (data: any) => {
      toast.success(`DNC generada: ${data.needsCreated} necesidades de capacitación registradas`);
      refetchDNC();
    },
    onError: (error: any) => {
      toast.error(`Error al generar DNC: ${error.message}`);
    },
  });

  const deleteDocMutation = trpc.employeeDocuments.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento eliminado");
      refetchDocs();
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const uploadDocMutation = trpc.employeeDocuments.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento cargado exitosamente");
      setIsUploading(false);
      setUploadNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetchDocs();
    },
    onError: (error: any) => {
      toast.error(`Error al cargar: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("El archivo no puede superar 16 MB");
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDocMutation.mutate({
        employeeId,
        documentType: uploadType as any,
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
        notes: uploadNotes || undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const deactivateMutation = trpc.employees.deactivate.useMutation({
    onSuccess: () => {
      alert("Empleado desactivado exitosamente");
      refetch();
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || "No se pudo desactivar el empleado"}`);
    },
  });

  const reactivateMutation = trpc.employees.reactivate.useMutation({
    onSuccess: () => {
      alert("Empleado reactivado exitosamente");
      refetch();
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || "No se pudo reactivar el empleado"}`);
    },
  });

  const handleDeactivate = () => {
    if (employee && window.confirm(`¿Está seguro de desactivar a ${employee.firstName} ${employee.lastName}?`)) {
      deactivateMutation.mutate({ id: employeeId });
    }
  };

  const handleReactivate = () => {
    if (employee && window.confirm(`¿Está seguro de reactivar a ${employee.firstName} ${employee.lastName}?`)) {
      reactivateMutation.mutate({ id: employeeId });
    }
  };

  const handleExportPDF = () => {
    if (!employee) return;
    const emp = employee as any;
    const courses = coursesHistory || [];
    const contractTypeLabel = emp.contractType === 'permanent' ? 'Permanente' : emp.contractType === 'temporary' ? 'Temporal' : emp.contractType === 'project' ? 'Por Proyecto' : emp.contractType || 'No especificado';
    const statusLabel = emp.isActive ? 'Activo' : 'Inactivo';
    const hireDateStr = emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No registrada';
    const createdAtStr = emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('es-MX') : '';
    const printDate = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Expediente — ${emp.firstName} ${emp.lastName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; }
    .header { background: #7c3aed; color: #fff; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 18pt; font-weight: bold; }
    .header .meta { text-align: right; font-size: 9pt; opacity: 0.9; }
    .confidential { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 8px 16px; font-size: 9pt; color: #92400e; margin: 0 30px; }
    .content { padding: 20px 30px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12pt; font-weight: bold; color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .field { margin-bottom: 6px; }
    .field-label { font-size: 8.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; }
    .field-value { font-size: 10.5pt; font-weight: 500; color: #111827; }
    .field-value.mono { font-family: 'Courier New', monospace; font-size: 10pt; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 9pt; font-weight: bold; }
    .badge-active { background: #d1fae5; color: #065f46; }
    .badge-inactive { background: #f3f4f6; color: #374151; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
    .sig-box { border-top: 2px solid #374151; padding-top: 8px; text-align: center; }
    .sig-box .sig-name { font-weight: bold; font-size: 10pt; }
    .sig-box .sig-role { font-size: 9pt; color: #6b7280; }
    .footer { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Expediente del Trabajador</h1>
      <div style="font-size:10pt;opacity:0.85;margin-top:4px;">Plataforma NOM-035 STPS 2018</div>
    </div>
    <div class="meta">
      <div>Generado: ${printDate}</div>
      <div>No. Empleado: ${emp.employeeNumber || 'N/A'}</div>
      <div>Folio: EXP-${emp.id}-${new Date().getFullYear()}</div>
    </div>
  </div>
  <div class="confidential">⚠ DOCUMENTO CONFIDENCIAL — Uso exclusivo de Recursos Humanos y Administración. NOM-035-STPS-2018.</div>
  <div class="content">
    <div class="section">
      <div class="section-title">1. Datos Generales del Trabajador</div>
      <div class="grid">
        <div class="field"><div class="field-label">Nombre Completo</div><div class="field-value">${emp.firstName} ${emp.lastName}</div></div>
        <div class="field"><div class="field-label">Estado</div><div class="field-value"><span class="badge ${emp.isActive ? 'badge-active' : 'badge-inactive'}">${statusLabel}</span></div></div>
        <div class="field"><div class="field-label">Correo Electrónico</div><div class="field-value">${emp.email || '—'}</div></div>
        <div class="field"><div class="field-label">Teléfono</div><div class="field-value">${emp.phone || '—'}</div></div>
        <div class="field"><div class="field-label">CURP</div><div class="field-value mono">${emp.curp || '—'}</div></div>
        <div class="field"><div class="field-label">RFC</div><div class="field-value mono">${emp.rfc || '—'}</div></div>
        <div class="field"><div class="field-label">NSS (IMSS)</div><div class="field-value mono">${emp.nss || '—'}</div></div>
        <div class="field"><div class="field-label">Cédula Profesional</div><div class="field-value mono">${emp.cedulaProfesional || '—'}</div></div>
        <div class="field"><div class="field-label">Nivel de Estudios</div><div class="field-value">${({
          primaria: 'Primaria',
          secundaria: 'Secundaria',
          preparatoria: 'Preparatoria / Bachillerato',
          tecnico: 'Técnico / Carrera Técnica',
          licenciatura: 'Licenciatura',
          especialidad: 'Especialidad',
          maestria: 'Maestría',
          doctorado: 'Doctorado',
          otro: 'Otro',
        } as Record<string, string>)[(emp as any).educationLevel] || (emp as any).educationLevel || '—'}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">2. Información Laboral</div>
      <div class="grid">
        <div class="field"><div class="field-label">Número de Empleado</div><div class="field-value">${emp.employeeNumber || '—'}</div></div>
        <div class="field"><div class="field-label">Departamento</div><div class="field-value">${emp.department || '—'}</div></div>
        <div class="field"><div class="field-label">Puesto</div><div class="field-value">${emp.position || '—'}</div></div>
        <div class="field"><div class="field-label">Tipo de Contrato</div><div class="field-value">${contractTypeLabel}</div></div>
        <div class="field"><div class="field-label">Fecha de Ingreso</div><div class="field-value">${hireDateStr}</div></div>
        <div class="field"><div class="field-label">Alta en Sistema</div><div class="field-value">${createdAtStr}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">4. Historial de Capacitación NOM-035</div>
      ${courses.length === 0
        ? '<p style="font-size:10pt;color:#6b7280;font-style:italic;">Sin cursos completados registrados en el sistema.</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:10pt;">
            <thead><tr style="background:#7c3aed;color:#fff;">
              <th style="padding:6px 10px;text-align:left;">Núm.</th>
              <th style="padding:6px 10px;text-align:left;">Curso</th>
              <th style="padding:6px 10px;text-align:center;">Fecha de Término</th>
              <th style="padding:6px 10px;text-align:center;">Avance</th>
            </tr></thead>
            <tbody>${courses.map((c: any, i: number) =>
              `<tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
                <td style="padding:5px 10px;">${i + 1}</td>
                <td style="padding:5px 10px;font-weight:500;">${c.courseName}</td>
                <td style="padding:5px 10px;text-align:center;">${c.completedAt}</td>
                <td style="padding:5px 10px;text-align:center;">${c.progressPercentage}%</td>
              </tr>`
            ).join('')}</tbody>
          </table>`
      }
    </div>
    <div class="section">
      <div class="section-title">3. Declaración de Autenticidad</div>
      <p style="font-size:10pt;line-height:1.6;color:#374151;">El presente expediente contiene información veraz y verificada del trabajador, generada a partir de los registros oficiales de la organización en cumplimiento con la NOM-035-STPS-2018. La información aquí contenida es confidencial y su uso está restringido al personal autorizado del área de Recursos Humanos y Administración.</p>
    </div>
    <div class="signatures">
      <div class="sig-box">
        <div style="height:50px;"></div>
        <div class="sig-name">Responsable de Recursos Humanos</div>
        <div class="sig-role">Nombre y Firma</div>
      </div>
      <div class="sig-box">
        <div style="height:50px;"></div>
        <div class="sig-name">${emp.firstName} ${emp.lastName}</div>
        <div class="sig-role">Trabajador — Firma de Conformidad</div>
      </div>
    </div>
    <div class="footer">Expediente generado el ${printDate} · Plataforma NOM-035 STPS 2018 · Folio EXP-${emp.id}-${new Date().getFullYear()}</div>
  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Cargando perfil del trabajador...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-destructive">Trabajador no encontrado</p>
        <div className="text-center mt-4">
          <Button onClick={() => setLocation("/employees")}>
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/employees")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista
        </Button>
      </div>

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-3xl">
                    {employee.firstName} {employee.lastName}
                  </CardTitle>
                  <Badge variant={employee.isActive ? "default" : "secondary"}>
                    {employee.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                  <ReentryBadge 
                    reentryCount={employee.reentryCount || 0}
                    previousHireDates={employee.previousHireDates}
                  />
                </div>
                <CardDescription className="text-lg mt-1">
                  {employee.position || "Sin puesto asignado"}
                </CardDescription>
                {employee.department && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {employee.department}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleExportPDF} title="Exportar expediente completo a PDF">
                <Download className="mr-2 h-4 w-4" />
                Exportar Expediente PDF
              </Button>
              <Link href={`/employees/${employeeId}/documents`}>
                <Button variant="default">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Expediente Electrónico
                </Button>
              </Link>
              <Link href={`/employees/${employeeId}/training-needs`}>
                <Button variant="default">
                  <Target className="mr-2 h-4 w-4" />
                  DNC (Necesidades de Capacitación)
                </Button>
              </Link>
              <Link href={`/employees/${employeeId}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </Link>
              {employee.isActive ? (
                <Button
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={deactivateMutation.isPending}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Desactivar
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={handleReactivate}
                  disabled={reactivateMutation.isPending}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Reactivar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employee.email && (
              <div className="flex items-start">
                <Mail className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Correo Electrónico</p>
                  <p className="text-sm text-muted-foreground">{employee.email}</p>
                </div>
              </div>
            )}
            {employee.phone && (
              <div className="flex items-start">
                <Phone className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Teléfono</p>
                  <p className="text-sm text-muted-foreground">{employee.phone}</p>
                </div>
              </div>
            )}
            {employee.curp && (
              <div className="flex items-start">
                <FileText className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">CURP</p>
                  <p className="text-sm text-muted-foreground font-mono">{employee.curp}</p>
                </div>
              </div>
            )}
            {(employee as any).rfc && (
              <div className="flex items-start">
                <FileText className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">RFC</p>
                  <p className="text-sm text-muted-foreground font-mono">{(employee as any).rfc}</p>
                </div>
              </div>
            )}
            {(employee as any).nss && (
              <div className="flex items-start">
                <FileText className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">NSS — Número de Seguridad Social</p>
                  <p className="text-sm text-muted-foreground font-mono">{(employee as any).nss}</p>
                </div>
              </div>
            )}
            {(employee as any).cedulaProfesional && (
              <div className="flex items-start">
                <FileText className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Cédula Profesional</p>
                  <p className="text-sm text-muted-foreground font-mono">{(employee as any).cedulaProfesional}</p>
                </div>
              </div>
            )}
            {(employee as any).educationLevel && (
              <div className="flex items-start">
                <GraduationCap className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Nivel de Estudios
                    {(() => {
                      const eduOrder = ['primaria','secundaria','preparatoria','tecnico','licenciatura','especialidad','maestria','doctorado'];
                      const empEdu = (employee as any).educationLevel;
                      const posEdu = (employee as any).positionMinimumEducation;
                      if (!posEdu || !empEdu) return null;
                      const meets = eduOrder.indexOf(empEdu) >= eduOrder.indexOf(posEdu);
                      return (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-normal ${meets ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {meets ? '✓ Cumple requisito' : '⚠ No cumple requisito del puesto'}
                        </span>
                      );
                    })()}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">{{
                    primaria: 'Primaria',
                    secundaria: 'Secundaria',
                    preparatoria: 'Preparatoria / Bachillerato',
                    tecnico: 'Técnico / Carrera Técnica',
                    licenciatura: 'Licenciatura',
                    especialidad: 'Especialidad',
                    maestria: 'Maestría',
                    doctorado: 'Doctorado',
                    otro: 'Otro',
                  }[(employee as any).educationLevel as string] || (employee as any).educationLevel}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Laboral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employee.employeeNumber && (
              <div className="flex items-start">
                <Briefcase className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Número de Empleado</p>
                  <p className="text-sm text-muted-foreground">{employee.employeeNumber}</p>
                </div>
              </div>
            )}
            {employee.department && (
              <div className="flex items-start">
                <Building className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Departamento</p>
                  <p className="text-sm text-muted-foreground">{employee.department}</p>
                </div>
              </div>
            )}
            {employee.hireDate && (
              <div className="flex items-start">
                <Calendar className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Fecha de Ingreso</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(employee.hireDate).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
            {employee.contractType && (
              <div className="flex items-start">
                <FileText className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Tipo de Contrato</p>
                  <p className="text-sm text-muted-foreground">
                    {employee.contractType === "permanent"
                      ? "Permanente"
                      : employee.contractType === "temporary"
                      ? "Temporal"
                      : "Por Contrato"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Fecha de Creación</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(employee.createdAt).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Última Actualización</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(employee.updatedAt).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Estado</p>
                <Badge variant={employee.isActive ? "default" : "secondary"}>
                  {employee.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

       {/* Timeline de historial laboral */}
      <div className="mt-6">
        <EmployeeTimeline 
          history={employeeHistory || []}
          employeeName={`${employee.firstName} ${employee.lastName}`}
        />
      </div>

      {/* ===== TABS PANEL ===== */}
      <div className="mt-8">
        {/* Tab navigation */}
        <div className="flex gap-1 border-b mb-6">
          {([
            { key: "info", label: "Información", icon: <User className="h-4 w-4" /> },
            { key: "contracts", label: "Contratos", icon: <Calendar className="h-4 w-4" /> },
            { key: "dnc", label: "Comparativa DNC", icon: <Target className="h-4 w-4" /> },
            { key: "docs", label: "Expediente Electrónico", icon: <FolderOpen className="h-4 w-4" /> },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: INFORMACIÓN (placeholder) ── */}
        {activeTab === "info" && (
          <Card>
            <CardHeader>
              <CardTitle>Historial de Capacitación</CardTitle>
              <CardDescription>Cursos completados en la plataforma NOM-035</CardDescription>
            </CardHeader>
            <CardContent>
              {(coursesHistory || []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Sin cursos completados registrados.</p>
              ) : (
                <div className="space-y-2">
                  {(coursesHistory as any[]).map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{c.courseName}</p>
                        <p className="text-xs text-muted-foreground">{c.completedAt}</p>
                      </div>
                      <Badge variant="outline">{c.progressPercentage}%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── TAB: CONTRATOS ── */}
        {activeTab === "contracts" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vencimiento de Contratos</CardTitle>
                <CardDescription>Fechas de vencimiento de los contratos del trabajador</CardDescription>
              </div>
              <Link href={`/employees/${employeeId}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Actualizar fechas
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([1, 2, 3] as const).map((n) => {
                  const dateKey = `contract${n}ExpirationDate` as string;
                  const dateVal = (employee as any)[dateKey];
                  const status = contractStatus(dateVal);
                  return (
                    <div key={n} className={`rounded-lg border p-4 ${
                      !dateVal ? "bg-muted/30" :
                      status.daysLeft !== null && status.daysLeft < 0 ? "bg-red-50 border-red-200" :
                      status.daysLeft !== null && status.daysLeft <= 7 ? "bg-red-50 border-red-200" :
                      status.daysLeft !== null && status.daysLeft <= 30 ? "bg-amber-50 border-amber-200" :
                      "bg-green-50 border-green-200"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Contrato {n}</span>
                      </div>
                      {dateVal ? (
                        <>
                          <p className="text-sm font-mono mb-1">
                            {new Date(dateVal).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Sin fecha registrada</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                Se envía alerta automática a RH 7 días antes del vencimiento de cualquier contrato.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── TAB: COMPARATIVA DNC ── */}
        {activeTab === "dnc" && (
          <div className="space-y-4">
            {dncLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando comparativa...</CardContent></Card>
            ) : !profileComparison ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No se pudo cargar la comparativa.</CardContent></Card>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{(profileComparison as any).summary.compliancePercentage}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Cumplimiento</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{(profileComparison as any).summary.compliantCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Competencias OK</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{(profileComparison as any).summary.gapCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Con Brecha</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className={`text-sm font-semibold ${ (profileComparison as any).employee.educationCompliant ? "text-green-600" : "text-red-600" }`}>
                      {(profileComparison as any).employee.educationCompliant ? "✓ Cumple" : "✗ No cumple"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Escolaridad</p>
                  </div>
                </div>

                {/* Education comparison */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Escolaridad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Nivel del empleado</p>
                        <Badge variant={(profileComparison as any).employee.educationCompliant ? "default" : "destructive"} className="capitalize">
                          {(profileComparison as any).employee.educationLevel || "No registrado"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Mínimo requerido por el puesto</p>
                        <Badge variant="outline" className="capitalize">
                          {(profileComparison as any).employee.minimumEducation || "Sin requisito"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Competency comparison table */}
                {!(profileComparison as any).summary.hasPositionProfile ? (
                  <Card>
                    <CardContent className="py-6 text-center">
                      <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">El puesto de este empleado no tiene un perfil de competencias configurado.</p>
                      <p className="text-xs text-muted-foreground mt-1">Configúralo en Gestión de Talento → Perfiles de Puesto.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base">Competencias del Puesto vs Empleado</CardTitle>
                      <LoadingButton
                        size="sm"
                        loading={generateDNCMutation.isPending}
                        loadingText="Generando DNC..."
                        onClick={() => generateDNCMutation.mutate({ employeeId })}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generar DNC
                      </LoadingButton>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(profileComparison as any).comparison.map((item: any, i: number) => (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                            item.compliant ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100"
                          }`}>
                            <div className="flex items-center gap-3">
                              {item.compliant
                                ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                              <div>
                                <p className="text-sm font-medium">{item.competencyName}</p>
                                <p className="text-xs text-muted-foreground capitalize">{item.competencyType}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <div className="text-center">
                                <p className="text-muted-foreground">Actual</p>
                                <Badge variant="outline" className="capitalize text-xs">{item.currentLevel}</Badge>
                              </div>
                              <span className="text-muted-foreground">→</span>
                              <div className="text-center">
                                <p className="text-muted-foreground">Requerido</p>
                                <Badge variant={item.compliant ? "default" : "destructive"} className="capitalize text-xs">{item.requiredLevel}</Badge>
                              </div>
                              {!item.compliant && item.priority && (
                                <Badge variant="outline" className={`text-xs ${
                                  item.priority === "critica" ? "border-red-400 text-red-600" :
                                  item.priority === "alta" ? "border-orange-400 text-orange-600" :
                                  item.priority === "media" ? "border-amber-400 text-amber-600" :
                                  "border-gray-300 text-gray-500"
                                }`}>
                                  {item.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB: EXPEDIENTE ELECTRÓNICO ── */}
        {activeTab === "docs" && (
          <div className="space-y-4">
            {/* Stats bar */}
            {docStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{(docStats as any).total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total documentos</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{(docStats as any).vigente}</p>
                  <p className="text-xs text-muted-foreground mt-1">Vigentes</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{(docStats as any).porVencer}</p>
                  <p className="text-xs text-muted-foreground mt-1">Por vencer</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{(docStats as any).vencido}</p>
                  <p className="text-xs text-muted-foreground mt-1">Vencidos</p>
                </div>
              </div>
            )}

            {/* Completeness indicator */}
            {empDocuments && (() => {
              const uploadedTypes = new Set((empDocuments as any[]).map((d: any) => d.documentType));
              const completedRequired = REQUIRED_DOCS.filter(t => uploadedTypes.has(t)).length;
              const pct = Math.round((completedRequired / REQUIRED_DOCS.length) * 100);
              return (
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Completitud del expediente obligatorio</p>
                      <span className="text-sm font-bold">{completedRequired}/{REQUIRED_DOCS.length} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${ pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500" }`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {REQUIRED_DOCS.map(t => (
                        <span key={t} className={`text-xs px-2 py-0.5 rounded-full border ${ uploadedTypes.has(t) ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700" }`}>
                          {uploadedTypes.has(t) ? "✓" : "✗"} {DOC_LABELS[t]}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Upload form */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cargar Nuevo Documento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Tipo de documento</label>
                    <select
                      value={uploadType}
                      onChange={e => setUploadType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {Object.entries(DOC_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Notas (opcional)</label>
                    <input
                      type="text"
                      value={uploadNotes}
                      onChange={e => setUploadNotes(e.target.value)}
                      placeholder="Observaciones..."
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Archivo (máx. 16 MB)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                    />
                  </div>
                </div>
                {isUploading && <p className="text-xs text-muted-foreground mt-2">Cargando documento...</p>}
              </CardContent>
            </Card>

            {/* Document list */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Documentos Cargados</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => refetchDocs()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                ) : !(empDocuments as any[])?.length ? (
                  <div className="text-center py-6">
                    <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No hay documentos cargados aún.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(empDocuments as any[]).map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{DOC_LABELS[doc.documentType] || doc.documentType}</p>
                            <p className="text-xs text-muted-foreground">{doc.fileName} · {new Date(doc.createdAt).toLocaleDateString("es-MX")}</p>
                            {doc.notes && <p className="text-xs text-muted-foreground italic">{doc.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={doc.status === "vigente" ? "default" : doc.status === "por_vencer" ? "secondary" : "destructive"} className="text-xs">
                            {doc.status === "vigente" ? "Vigente" : doc.status === "por_vencer" ? "Por vencer" : "Vencido"}
                          </Badge>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver documento">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Eliminar documento"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar "${DOC_LABELS[doc.documentType] || doc.documentType}"?`)) {
                                deleteDocMutation.mutate({ documentId: doc.id });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
