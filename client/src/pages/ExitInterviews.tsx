import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { UserX, ClipboardList, TrendingUp, AlertCircle, CheckCircle2, Clock, Plus, FileText, BarChart2 } from "lucide-react";

const TERMINATION_REASON_LABELS: Record<string, string> = {
  resignation: "Renuncia voluntaria",
  dismissal: "Despido",
  retirement: "Jubilación",
  contract_end: "Fin de contrato",
  mutual_agreement: "Mutuo acuerdo",
  death: "Fallecimiento",
  other: "Otro",
};

const CHART_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#be185d"];

// ── Formulario de Entrevista ─────────────────────────────────────────────────
function InterviewForm({ interviewId, onComplete }: { interviewId: number; onComplete: () => void }) {
  const { data: questions, isLoading } = trpc.exitInterviews.getQuestions.useQuery();
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [comments, setComments] = useState("");
  const submitMutation = trpc.exitInterviews.submitResponses.useMutation({
    onSuccess: () => {
      toast.success("Entrevista completada exitosamente");
      onComplete();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Cargando preguntas...</div>;
  if (!questions?.length) return <div className="text-center py-8 text-muted-foreground">No hay preguntas disponibles</div>;

  const handleSubmit = () => {
    const answered = Object.keys(responses).length;
    if (answered < questions.length) {
      toast.error(`Por favor responde todas las preguntas (${answered}/${questions.length} respondidas)`);
      return;
    }
    submitMutation.mutate({
      interviewId,
      responses: Object.entries(responses).map(([qId, response]) => ({
        questionId: parseInt(qId),
        response,
      })),
      additionalComments: comments || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Confidencialidad garantizada:</strong> Sus respuestas son estrictamente confidenciales y solo serán utilizadas para mejorar las condiciones laborales de la organización.
      </div>

      {questions.map((q, idx) => (
        <Card key={q.id} className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <p className="font-medium mb-3 text-sm">
              <span className="text-muted-foreground mr-2">{idx + 1}.</span>
              {q.questionText}
            </p>
            {q.questionType === "multiple_choice" && Array.isArray(q.options) ? (
              <RadioGroup
                value={responses[q.id] ?? ""}
                onValueChange={(val) => setResponses(prev => ({ ...prev, [q.id]: val }))}
              >
                <div className="grid grid-cols-1 gap-2">
                  {(q.options as string[]).map((opt) => (
                    <div key={opt} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt} id={`q${q.id}-${opt}`} />
                      <Label htmlFor={`q${q.id}-${opt}`} className="cursor-pointer text-sm">{opt}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <Textarea
                placeholder="Escribe tu respuesta..."
                value={responses[q.id] ?? ""}
                onChange={(e) => setResponses(prev => ({ ...prev, [q.id]: e.target.value }))}
                rows={3}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones adicionales</CardTitle>
          <CardDescription>Espacio para comentarios puntuales que desee compartir (opcional)</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Escribe aquí cualquier comentario adicional..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitMutation.isPending}
        className="w-full"
        size="lg"
      >
        {submitMutation.isPending ? "Enviando..." : "Enviar Entrevista"}
      </Button>
    </div>
  );
}

// ── Formulario de Registro de Baja ───────────────────────────────────────────
function RegisterTerminationDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [terminationDate, setTerminationDate] = useState("");
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [notes, setNotes] = useState("");

  const { data: employeesData } = trpc.employees.list.useQuery({ page: 1, pageSize: 100 });
  const registerMutation = trpc.exitInterviews.registerTermination.useMutation({
    onSuccess: () => {
      toast.success("Baja registrada y entrevista de salida creada");
      setOpen(false);
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!employeeId || !terminationDate || !reason) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }
    registerMutation.mutate({
      employeeId: parseInt(employeeId),
      terminationDate,
      terminationReason: reason as any,
      terminationReasonDetails: details || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Baja
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Baja de Empleado</DialogTitle>
          <DialogDescription>
            Al registrar la baja se creará automáticamente una entrevista de salida pendiente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Empleado *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado..." />
              </SelectTrigger>
              <SelectContent>
                {(employeesData?.employees ?? []).map((emp: any) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha de baja *</Label>
            <Input type="date" value={terminationDate} onChange={e => setTerminationDate(e.target.value)} />
          </div>
          <div>
            <Label>Motivo de baja *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TERMINATION_REASON_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Detalles del motivo</Label>
            <Textarea placeholder="Descripción adicional..." value={details} onChange={e => setDetails(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Notas internas</Label>
            <Textarea placeholder="Notas para RH..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={registerMutation.isPending} className="w-full">
            {registerMutation.isPending ? "Registrando..." : "Registrar Baja"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Dashboard de Análisis ────────────────────────────────────────────────────
function AnalyticsDashboard() {
  const { data: analytics, isLoading } = trpc.exitInterviews.getAnalytics.useQuery({});

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Cargando análisis...</div>;
  if (!analytics) return null;

  const reasonData = analytics.terminationReasons.map(r => ({
    name: TERMINATION_REASON_LABELS[r.reason ?? ""] ?? r.reason ?? "Desconocido",
    value: r.total,
  }));

  const mainReasonData = analytics.mainReasonDistribution.slice(0, 6).map(r => ({
    name: r.response.length > 20 ? r.response.substring(0, 20) + "..." : r.response,
    fullName: r.response,
    total: r.total,
  }));

  const trendData = analytics.monthlyTrend.map(t => ({
    mes: t.month,
    total: t.total,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalCompleted}</p>
                <p className="text-sm text-muted-foreground">Entrevistas completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.recommendationScore}%</p>
                <p className="text-sm text-muted-foreground">Índice de recomendación</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.terminationReasons.length}</p>
                <p className="text-sm text-muted-foreground">Tipos de motivos registrados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de motivos de baja */}
        {reasonData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribución de Motivos de Baja</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {reasonData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Razones principales de salida */}
        {mainReasonData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Razones Principales de Salida</CardTitle>
              <CardDescription>Respuestas a la pregunta de motivo principal</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={mainReasonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val, _, props) => [val, props.payload.fullName]} />
                  <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tendencia mensual */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendencia Mensual de Entrevistas Completadas</CardTitle>
            <CardDescription>Últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {trendData.length === 0 && reasonData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay suficientes datos para mostrar el análisis.</p>
          <p className="text-sm">Completa entrevistas de salida para ver las estadísticas.</p>
        </div>
      )}
    </div>
  );
}

// ── Página Principal ─────────────────────────────────────────────────────────
export default function ExitInterviews() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeInterviewId, setActiveInterviewId] = useState<number | null>(null);
  const [listRefresh, setListRefresh] = useState(0);

  const { data: listData, isLoading, refetch } = trpc.exitInterviews.list.useQuery({
    status: "all",
    page: 1,
    pageSize: 50,
  });

  const initMutation = trpc.exitInterviews.initDefaultQuestions.useMutation({
    onSuccess: (res) => {
      if (res.initialized) toast.success(`${res.count} preguntas inicializadas correctamente`);
      else toast.info(res.message);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleRefresh = () => {
    refetch();
    setListRefresh(p => p + 1);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb items={[
        { label: "Gestión de Personal", href: "/employees" },
        { label: "Entrevistas de Salida" },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserX className="w-6 h-6 text-primary" />
            Entrevistas de Salida
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión confidencial del proceso de baja y análisis de causas de rotación
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
              <FileText className="w-4 h-4 mr-2" />
              Inicializar Preguntas
            </Button>
            <RegisterTerminationDialog onSuccess={handleRefresh} />
          </div>
        )}
      </div>

      <Tabs defaultValue={isAdmin ? "list" : "pending"}>
        <TabsList className="mb-4">
          {isAdmin && <TabsTrigger value="list">Todas las Entrevistas</TabsTrigger>}
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          {isAdmin && <TabsTrigger value="analytics">Análisis de Rotación</TabsTrigger>}
        </TabsList>

        {/* Lista de entrevistas (admin) */}
        {isAdmin && (
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registro de Entrevistas</CardTitle>
                <CardDescription>Total: {listData?.total ?? 0} entrevistas</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                ) : !listData?.rows?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No hay entrevistas registradas aún.</p>
                    <p className="text-sm">Registra una baja para crear la primera entrevista.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listData.rows.map((row) => (
                      <div key={row.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{row.employeeName}</span>
                            <Badge variant={row.status === "completed" ? "default" : "secondary"} className="text-xs">
                              {row.status === "completed" ? (
                                <><CheckCircle2 className="w-3 h-3 mr-1" />Completada</>
                              ) : (
                                <><Clock className="w-3 h-3 mr-1" />Pendiente</>
                              )}
                            </Badge>
                            {row.isConfidential && (
                              <Badge variant="outline" className="text-xs">Confidencial</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-3">
                            <span>{row.department ?? "Sin departamento"}</span>
                            <span>•</span>
                            <span>{TERMINATION_REASON_LABELS[row.terminationReason ?? ""] ?? row.terminationReason}</span>
                            <span>•</span>
                            <span>{row.terminationDate ? new Date(row.terminationDate).toLocaleDateString() : "—"}</span>
                          </div>
                        </div>
                        {row.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => setActiveInterviewId(row.id)}>
                            Aplicar Entrevista
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Entrevistas pendientes del usuario actual */}
        <TabsContent value="pending">
          {activeInterviewId ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Formulario de Entrevista de Salida</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveInterviewId(null)}>← Volver</Button>
                </div>
                <CardDescription>
                  Responde con honestidad. Tus respuestas son completamente confidenciales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewForm
                  interviewId={activeInterviewId}
                  onComplete={() => { setActiveInterviewId(null); handleRefresh(); }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entrevistas Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                ) : (
                  (() => {
                    const pending = listData?.rows?.filter(r => r.status === "pending") ?? [];
                    return pending.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No hay entrevistas pendientes.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pending.map((row) => (
                          <div key={row.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{row.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{row.department} • {row.terminationDate ? new Date(row.terminationDate).toLocaleDateString() : "—"}</p>
                            </div>
                            <Button size="sm" onClick={() => setActiveInterviewId(row.id)}>
                              Iniciar Entrevista
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dashboard de análisis (solo admin) */}
        {isAdmin && (
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
