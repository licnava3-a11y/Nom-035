import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, BookOpen, Calendar, FileText, GraduationCap,
  Clock, CheckCircle2, XCircle, AlertCircle, Building2, Briefcase
} from "lucide-react";

// ─── Status helpers ────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
    in_progress: { label: "En proceso", color: "bg-blue-100 text-blue-800" },
    completed: { label: "Completado", color: "bg-green-100 text-green-800" },
    expired: { label: "Vencido", color: "bg-red-100 text-red-800" },
    approved: { label: "Aprobado", color: "bg-green-100 text-green-800" },
    rejected: { label: "Rechazado", color: "bg-red-100 text-red-800" },
    cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-800" },
  };
  const s = map[status] ?? { label: status, color: "bg-gray-100 text-gray-800" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function EmployeePortal() {
  const { token } = useParams<{ token: string }>();
  const [activeTab, setActiveTab] = useState("courses");

  const { data: tokenData, isLoading: loadingToken, error: tokenError } = trpc.employeePortal.validateToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  const { data: coursesData, isLoading: loadingCourses } = trpc.employeePortal.getEmployeeCourses.useQuery(
    { token: token ?? "" },
    { enabled: !!token && !!tokenData?.valid }
  );

  const { data: vacationsData, isLoading: loadingVacations } = trpc.employeePortal.getEmployeeVacations.useQuery(
    { token: token ?? "" },
    { enabled: !!token && !!tokenData?.valid && activeTab === "vacations" }
  );

  // ── Error / Loading states ──────────────────────────────────────────────────

  if (loadingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (tokenError || !tokenData?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace inválido o expirado</h1>
          <p className="text-gray-500 text-sm">
            Este enlace de acceso al portal ya no es válido. Solicita un nuevo enlace a tu área de Recursos Humanos.
          </p>
        </div>
      </div>
    );
  }

  const emp = tokenData.employee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-blue-200">Portal del Empleado — NOM-035 STPS</p>
              <h1 className="text-xl font-bold">{emp.firstName} {emp.lastName}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-blue-100">
            {emp.employeeNumber && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                No. {emp.employeeNumber}
              </span>
            )}
            {emp.departmentName && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {emp.departmentName}
              </span>
            )}
            {emp.positionName && (
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                {emp.positionName}
              </span>
            )}
            {emp.hireDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Ingreso: {fmtDate(emp.hireDate)}
              </span>
            )}
          </div>
          <p className="text-xs text-blue-200 mt-2">
            Acceso válido hasta {fmtDate(tokenData.expiresAt)}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Capacitaciones
            </TabsTrigger>
            <TabsTrigger value="vacations" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Vacaciones
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Mi Información
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Capacitaciones ─────────────────────────────────────────── */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Mis Capacitaciones Asignadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCourses ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : !coursesData?.courses.length ? (
                  <div className="text-center py-10 text-gray-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tienes capacitaciones asignadas actualmente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {coursesData.courses.map((c) => (
                      <div key={c.assignmentId} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{c.trainingTitle}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Asignado: {fmtDate(c.assignedDate)}
                            {c.completionDate && ` · Completado: ${fmtDate(c.completionDate)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          {c.score != null && (
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                              {c.score}/100
                            </span>
                          )}
                          {statusBadge(c.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Vacaciones ─────────────────────────────────────────────── */}
          <TabsContent value="vacations">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Mis Solicitudes de Vacaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingVacations ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : !vacationsData?.vacations.length ? (
                  <div className="text-center py-10 text-gray-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tienes solicitudes de vacaciones registradas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vacationsData.vacations.map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">
                            {fmtDate(v.startDate)} → {fmtDate(v.endDate)}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {v.requestedDays} días solicitados · Regreso: {fmtDate(v.returnDate)}
                          </p>
                          {v.rejectionReason && (
                            <p className="text-xs text-red-500 mt-0.5">Motivo: {v.rejectionReason}</p>
                          )}
                        </div>
                        <div className="ml-3">{statusBadge(v.status)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Mi Información ─────────────────────────────────────────── */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Mi Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Nombre completo", value: `${emp.firstName} ${emp.lastName}` },
                    { label: "Correo electrónico", value: emp.email },
                    { label: "No. de empleado", value: emp.employeeNumber ?? "—" },
                    { label: "Departamento", value: emp.departmentName ?? "—" },
                    { label: "Puesto", value: emp.positionName ?? "—" },
                    { label: "Fecha de ingreso", value: fmtDate(emp.hireDate) },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-gray-50 border">
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Para actualizar tu información, contacta a Recursos Humanos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 pb-8 text-center">
        <p className="text-xs text-gray-400">
          Portal del Empleado · Plataforma NOM-035 STPS 2018 · Acceso personal e intransferible
        </p>
      </div>
    </div>
  );
}
