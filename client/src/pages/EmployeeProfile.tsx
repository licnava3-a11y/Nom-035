import { useState, useRef, useCallback } from "react";
import { PsychometricTab } from "@/components/PsychometricTab";
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
  PenLine,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
} from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";

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

function PortalLinkButton({ employeeId, employeeEmail }: { employeeId: number; employeeEmail?: string }) {
  const generatePortalLinkMutation = trpc.employees.generatePortalLink.useMutation({
    onSuccess: () => {
      toast.success(`Enlace enviado a ${employeeEmail || 'empleado'}`);
    },
    onError: (err: any) => {
      toast.error(`Error al generar enlace de portal: ${err.message}`);
    },
  });
  return (
    <Button
      onClick={() => generatePortalLinkMutation.mutate({ employeeId })}
      disabled={generatePortalLinkMutation.isPending}
      className="w-full"
    >
      {generatePortalLinkMutation.isPending ? 'Enviando...' : 'Enviar Enlace de Portal'}
    </Button>
  );
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const employeeId = parseInt(id || "0");
  const [activeTab, setActiveTab] = useState<"info" | "dnc" | "contracts" | "docs" | "salary" | "vacations" | "psychometric">("info");
  // Salary history state
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [newSalary, setNewSalary] = useState("");
  const [prevSalary, setPrevSalary] = useState("");
  const [salaryReason, setSalaryReason] = useState("");
  const [salaryDate, setSalaryDate] = useState(new Date().toISOString().split("T")[0]);
  const [salaryType, setSalaryType] = useState<"annual_review" | "promotion" | "market_adjustment" | "retention" | "correction" | "other">("annual_review");
  const [signingContract, setSigningContract] = useState<"1" | "2" | "3" | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
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

  // Salary history queries
  const { data: salaryHistoryData, isLoading: salaryLoading, refetch: refetchSalary } = trpc.salaryHistory.list.useQuery(
    { employeeId },
    { enabled: employeeId > 0 && activeTab === "salary" }
  );
  const { data: currentSalaryData } = trpc.salaryHistory.getCurrentSalary.useQuery(
    { employeeId },
    { enabled: employeeId > 0 && activeTab === "salary" }
  );
  const addSalaryMutation = trpc.salaryHistory.add.useMutation({
    onSuccess: () => {
      toast.success("Cambio salarial registrado");
      setShowAddSalary(false);
      setNewSalary("");
      setPrevSalary("");
      setSalaryReason("");
      refetchSalary();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });
  const deleteSalaryMutation = trpc.salaryHistory.delete.useMutation({
    onSuccess: () => { toast.success("Registro eliminado"); refetchSalary(); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  // Vacation balance and history
  const { data: vacationBalance } = trpc.vacations.getBalance.useQuery(
    { employeeId },
    { enabled: employeeId > 0 && activeTab === "vacations" }
  );
  const { data: vacationHistory = [] } = trpc.vacations.list.useQuery(
    { employeeId },
    { enabled: employeeId > 0 && activeTab === "vacations" }
  );

  const { data: contractSigs, refetch: refetchContractSigs } = trpc.hiring.getContractSignatures.useQuery(
    { employeeId },
    { enabled: employeeId > 0 && activeTab === "contracts" }
  );
  const saveContractSigMutation = trpc.hiring.saveContractSignature.useMutation({
    onSuccess: () => {
      toast.success("Firma guardada exitosamente (NOM-151)");
      setSigningContract(null);
      setSignerName("");
      setSignerRole("");
      refetchContractSigs();
    },
    onError: (error: any) => toast.error(`Error al guardar firma: ${error.message}`),
  });
  const handleContractSignature = useCallback((dataUrl: string) => {
    if (!signingContract || !signerName.trim()) {
      toast.error("Ingrese el nombre del firmante");
      return;
    }
    saveContractSigMutation.mutate({
      employeeId,
      contractNumber: signingContract,
      signatureDataUrl: dataUrl,
      signerName: signerName.trim(),
      signerRole: signerRole.trim() || undefined,
    });
  }, [signingContract, signerName, signerRole, employeeId, saveContractSigMutation]);

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
            { key: "salary", label: "Historial Salarial", icon: <DollarSign className="h-4 w-4" /> },
            { key: "vacations", label: "Vacaciones", icon: <Calendar className="h-4 w-4" /> },
            { key: "psychometric", label: "Evaluación Psicometrica", icon: <ShieldCheck className="h-4 w-4" /> },
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
          <div className="space-y-4">
            {/* Botón de envío de enlace de portal */}
            <Card>
              <CardHeader>
                <CardTitle>Portal del Empleado</CardTitle>
                <CardDescription>Enviar enlace de acceso al portal personal</CardDescription>
              </CardHeader>
              <CardContent>
<PortalLinkButton employeeId={employeeId} employeeEmail={employee?.email} />
              </CardContent>
            </Card>

            {/* Historial de Capacitación */}
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
          </div>
        )}

        {/* ── TAB: CONTRATOS ── */}
        {activeTab === "contracts" && (
          <div className="space-y-4">
            {/* ── Vencimiento de contratos ── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Vencimiento de Contratos</CardTitle>
                  <CardDescription>Fechas de vencimiento y estado de cada contrato</CardDescription>
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
                    const sigForContract = (contractSigs || []).filter((s: any) => s.contractNumber === String(n));
                    const lastSig = sigForContract[sigForContract.length - 1];
                    return (
                      <div key={n} className={`rounded-lg border p-4 space-y-3 ${
                        !dateVal ? "bg-muted/30" :
                        status.daysLeft !== null && status.daysLeft < 0 ? "bg-red-50 border-red-200" :
                        status.daysLeft !== null && status.daysLeft <= 7 ? "bg-red-50 border-red-200" :
                        status.daysLeft !== null && status.daysLeft <= 30 ? "bg-amber-50 border-amber-200" :
                        "bg-green-50 border-green-200"
                      }`}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-semibold">Contrato {n}</span>
                        </div>
                        {dateVal ? (
                          <>
                            <p className="text-sm font-mono">
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
                        {/* Firma digital */}
                        {lastSig ? (
                          <div className="border-t pt-2 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Firmado digitalmente
                            </div>
                            <img src={lastSig.signatureImageUrl} alt="Firma" className="h-10 object-contain border rounded bg-white" />
                            <p className="text-xs text-muted-foreground">{lastSig.signerName}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate" title={lastSig.signatureHash ?? undefined}>
                              SHA-256: {lastSig.signatureHash?.substring(0, 12)}…
                            </p>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1.5 text-xs"
                            onClick={() => setSigningContract(String(n) as "1" | "2" | "3")}
                          >
                            <PenLine className="h-3.5 w-3.5" />
                            Agregar firma digital
                          </Button>
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

            {/* ── Panel de firma digital ── */}
            {signingContract && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PenLine className="h-4 w-4 text-blue-600" />
                    Firma Digital — Contrato {signingContract} (NOM-151)
                  </CardTitle>
                  <CardDescription>
                    La firma se almacenará con hash SHA-256 y marca de tiempo del servidor para garantizar su validez legal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Nombre del firmante *</label>
                      <input
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        placeholder="Nombre completo"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Cargo / Rol</label>
                      <input
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        placeholder="Ej: Trabajador, Representante Legal"
                        value={signerRole}
                        onChange={(e) => setSignerRole(e.target.value)}
                      />
                    </div>
                  </div>
                  <SignatureCanvas
                    onSave={handleContractSignature}
                    onCancel={() => { setSigningContract(null); setSignerName(""); setSignerRole(""); }}
                  />
                  {saveContractSigMutation.isPending && (
                    <p className="text-sm text-blue-600 animate-pulse">Guardando firma y subiendo a S3…</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
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
        {/* ── TAB: HISTORIAL SALARIAL ── */}
        {activeTab === "salary" && (
          <div className="space-y-4">
            {/* Current salary card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Salario Actual</CardTitle>
                  <CardDescription>Salario mensual bruto registrado en el sistema</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowAddSalary(!showAddSalary)} className="gap-1">
                  <Plus className="h-4 w-4" /> Registrar Cambio
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {currentSalaryData?.currentSalary
                    ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(parseFloat(currentSalaryData.currentSalary))
                    : <span className="text-muted-foreground text-lg">No registrado</span>}
                </div>
                {currentSalaryData?.position && (
                  <p className="text-sm text-muted-foreground mt-1">{currentSalaryData.position} · {currentSalaryData.department}</p>
                )}
              </CardContent>
            </Card>

            {/* Add salary form */}
            {showAddSalary && (
              <Card className="border-primary/30">
                <CardHeader><CardTitle className="text-base">Registrar Cambio Salarial</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Salario Anterior (MXN)</label>
                      <input type="number" value={prevSalary} onChange={e => setPrevSalary(e.target.value)} placeholder="Ej. 25000" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nuevo Salario (MXN) *</label>
                      <input type="number" value={newSalary} onChange={e => setNewSalary(e.target.value)} placeholder="Ej. 28000" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Ajuste</label>
                      <select value={salaryType} onChange={e => setSalaryType(e.target.value as any)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="annual_review">Revisión Anual</option>
                        <option value="promotion">Promoción</option>
                        <option value="market_adjustment">Ajuste de Mercado</option>
                        <option value="retention">Retención</option>
                        <option value="correction">Corrección</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha Efectiva *</label>
                      <input type="date" value={salaryDate} onChange={e => setSalaryDate(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motivo / Notas</label>
                      <input type="text" value={salaryReason} onChange={e => setSalaryReason(e.target.value)} placeholder="Descripción del cambio salarial" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => {
                        if (!newSalary || parseFloat(newSalary) <= 0) { toast.error("Ingrese el nuevo salario"); return; }
                        addSalaryMutation.mutate({
                          employeeId,
                          previousSalary: prevSalary ? parseFloat(prevSalary) : undefined,
                          newSalary: parseFloat(newSalary),
                          adjustmentType: salaryType,
                          effectiveDate: salaryDate,
                          reason: salaryReason || undefined,
                        });
                      }}
                      disabled={addSalaryMutation.isPending}
                    >
                      {addSalaryMutation.isPending ? "Guardando..." : "Guardar Cambio"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddSalary(false)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Salary history table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historial de Cambios Salariales</CardTitle>
                <CardDescription>Registro de ajustes salariales para auditoría NMX-025 (Igualdad Laboral)</CardDescription>
              </CardHeader>
              <CardContent>
                {salaryLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando historial...</p>
                ) : !salaryHistoryData || salaryHistoryData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay cambios salariales registrados</p>
                    <p className="text-xs mt-1">Use el botón "Registrar Cambio" para agregar el primer registro</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Fecha Efectiva</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Salario Anterior</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Nuevo Salario</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Ajuste</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Motivo</th>
                          <th className="py-2 px-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryHistoryData.map((row: any) => {
                          const pct = row.adjustmentPercentage ? parseFloat(row.adjustmentPercentage) : null;
                          const isPositive = pct !== null && pct > 0;
                          const isNegative = pct !== null && pct < 0;
                          const typeLabels: Record<string, string> = {
                            annual_review: "Revisión Anual",
                            promotion: "Promoción",
                            market_adjustment: "Ajuste de Mercado",
                            retention: "Retención",
                            correction: "Corrección",
                            other: "Otro",
                          };
                          return (
                            <tr key={row.id} className="border-b hover:bg-muted/30">
                              <td className="py-2 px-3">{row.effectiveDate ? new Date(row.effectiveDate).toLocaleDateString("es-MX") : "—"}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground">
                                {row.previousSalary ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(parseFloat(row.previousSalary)) : "—"}
                              </td>
                              <td className="py-2 px-3 text-right font-medium">
                                {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(parseFloat(row.newSalary))}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {pct !== null ? (
                                  <span className={`flex items-center justify-center gap-1 text-xs font-medium ${isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-muted-foreground"}`}>
                                    {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                    {isPositive ? "+" : ""}{pct.toFixed(1)}%
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-xs">{typeLabels[row.adjustmentType] || row.adjustmentType || "—"}</Badge>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground text-xs max-w-[200px] truncate">{row.reason || "—"}</td>
                              <td className="py-2 px-3">
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => { if (window.confirm("¿Eliminar este registro?")) deleteSalaryMutation.mutate({ id: row.id }); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {/* ===== VACATION TAB ===== */}
        {activeTab === "vacations" && (
          <div className="space-y-6">
            {/* Balance cards */}
            {vacationBalance ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Días ganados</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{vacationBalance.earnedDays}</div>
                    <p className="text-xs text-muted-foreground mt-1">Antigüedad: {vacationBalance.yearsOfService} año{vacationBalance.yearsOfService !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Días usados</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">{vacationBalance.usedDays}</div>
                    <p className="text-xs text-muted-foreground mt-1">Solicitudes aprobadas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Días pendientes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{vacationBalance.pendingDays}</div>
                    <p className="text-xs text-muted-foreground mt-1">En espera de aprobación</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Días disponibles</CardTitle></CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${(vacationBalance.availableDays ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{vacationBalance.availableDays}</div>
                    <p className="text-xs text-muted-foreground mt-1">Saldo actual</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Calculando saldo de vacaciones...</CardContent></Card>
            )}

            {/* Vacation history table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Historial de Solicitudes</CardTitle>
                <CardDescription>Todas las solicitudes de vacaciones del empleado, ordenadas por fecha de creación</CardDescription>
              </CardHeader>
              <CardContent>
                {(vacationHistory as any[]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No hay solicitudes de vacaciones registradas</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-3">Periodo</th>
                        <th className="text-left py-2 px-3">Días</th>
                        <th className="text-left py-2 px-3">Regreso</th>
                        <th className="text-left py-2 px-3">Estado</th>
                        <th className="text-left py-2 px-3">Notas</th>
                        <th className="text-left py-2 px-3">Solicitado</th>
                      </tr></thead>
                      <tbody>
                        {(vacationHistory as any[]).map((req) => {
                          const statusMap: Record<string, { label: string; cls: string }> = {
                            pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-800" },
                            approved: { label: "Aprobado", cls: "bg-green-100 text-green-800" },
                            rejected: { label: "Rechazado", cls: "bg-red-100 text-red-800" },
                            cancelled: { label: "Cancelado", cls: "bg-gray-100 text-gray-600" },
                          };
                          const s = statusMap[req.status] || { label: req.status, cls: "bg-gray-100" };
                          return (
                            <tr key={req.id} className="border-b hover:bg-muted/30">
                              <td className="py-2 px-3">
                                {req.startDate ? new Date(req.startDate).toLocaleDateString('es-MX') : '-'}
                                {' — '}
                                {req.endDate ? new Date(req.endDate).toLocaleDateString('es-MX') : '-'}
                              </td>
                              <td className="py-2 px-3 font-semibold">{req.requestedDays}</td>
                              <td className="py-2 px-3">{req.returnDate ? new Date(req.returnDate).toLocaleDateString('es-MX') : '-'}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">{req.notes || '-'}</td>
                              <td className="py-2 px-3 text-muted-foreground">{req.createdAt ? new Date(req.createdAt).toLocaleDateString('es-MX') : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

        {activeTab === "psychometric" && employee && (
          <div className="mt-4">
            <PsychometricTab
              employeeId={employeeId}
              employeeName={`${employee.firstName} ${employee.lastName}`}
            />
          </div>
        )}
    </div>
  );
}
