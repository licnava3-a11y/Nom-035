import { useLocation, useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReentryBadge } from "@/components/ReentryBadge";
import { EmployeeTimeline } from "@/components/EmployeeTimeline";
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
} from "lucide-react";

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const employeeId = parseInt(id || "0");

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
        <div class="field"><div class="field-label">Nivel de Estudios</div><div class="field-value">${{
          primaria: 'Primaria',
          secundaria: 'Secundaria',
          preparatoria: 'Preparatoria / Bachillerato',
          tecnico: 'Técnico / Carrera Técnica',
          licenciatura: 'Licenciatura',
          especialidad: 'Especialidad',
          maestria: 'Maestría',
          doctorado: 'Doctorado',
          otro: 'Otro',
        }[(emp as any).educationLevel] || (emp as any).educationLevel || '—'}</div></div>
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

      {/* Future sections placeholder */}
      {/* Timeline de historial laboral */}
      <div className="mt-6">
        <EmployeeTimeline 
          history={employeeHistory || []}
          employeeName={`${employee.firstName} ${employee.lastName}`}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Secciones Adicionales</CardTitle>
          <CardDescription>
            Próximamente: Historial de capacitación, evaluaciones de desempeño, documentos del expediente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta sección se expandirá con información adicional del empleado como historial de cursos,
            evaluaciones, documentos del expediente digital, y más.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
