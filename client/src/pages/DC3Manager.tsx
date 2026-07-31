import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Download, Upload, Plus, Search, FileSpreadsheet,
  Pencil, Trash2, FileText, AlertCircle, CheckCircle2,
  Loader2, UserCheck, Info, ShieldCheck, ShieldX, X, PenLine, ListChecks, Eye
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import DC3SignaturePanel from "@/components/DC3SignaturePanel";
import { PDFViewer } from "@/components/PDFViewer";

// ─── Typeahead de empleado ────────────────────────────────────────────────────

function EmployeeTypeahead({ onSelect }: {
  onSelect: (emp: { firstName: string; lastName: string; curp?: string | null; positionTitle?: string | null }) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = trpc.employees.list.useQuery(
    { search: debouncedQuery, page: 1, pageSize: 8 },
    { enabled: debouncedQuery.length >= 2 }
  );

  const employees = (data as any)?.employees ?? (data as any)?.data ?? [];

  return (
    <div className="relative">
      <Label className="flex items-center gap-1.5 mb-1">
        <Search className="h-3 w-3" />
        Buscar empleado registrado
        <span className="text-xs text-muted-foreground font-normal">(opcional — prellenado automático)</span>
      </Label>
      <div className="relative">
        <Input
          placeholder="Escribe nombre o CURP del trabajador..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {isLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && employees.length > 0 && (
        <div className="absolute z-50 w-full bg-background border rounded-md shadow-lg mt-1 max-h-52 overflow-y-auto">
          {employees.map((emp: any) => (
            <button
              key={emp.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex items-center justify-between gap-2"
              onMouseDown={() => {
                onSelect(emp);
                setQuery(`${emp.lastName ?? ""} ${emp.firstName ?? ""}`.trim());
                setOpen(false);
              }}
            >
              <span className="font-medium">{emp.lastName} {emp.firstName}</span>
              <span className="text-xs text-muted-foreground font-mono">{emp.curp ?? emp.employeeNumber ?? ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBase64(data: string, filename: string, contentType: string) {
  const blob = new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusBadge(status: string) {
  if (status === "issued") return <Badge className="bg-green-100 text-green-800 border-green-200">Emitida</Badge>;
  if (status === "cancelled") return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelada</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Borrador</Badge>;
}

// ─── Formulario DC-3 ──────────────────────────────────────────────────────────

interface DC3FormData {
  workerName: string;
  workerCurp: string;
  workerOccupationCnoKey: string;
  workerOccupationCnoDesc: string;
  workerPosition: string;
  companyName: string;
  companyRfc: string;
  courseName: string;
  courseDurationHours: string;
  periodStartDate: string;
  periodEndDate: string;
  thematicAreaKey: string;
  thematicAreaDesc: string;
  trainingAgentName: string;
  instructorName: string;
  employerRepName: string;
  workerRepName: string;
  status: "draft" | "issued" | "cancelled";
  folioNumber: string;
  notes: string;
}

const emptyForm: DC3FormData = {
  workerName: "", workerCurp: "", workerOccupationCnoKey: "", workerOccupationCnoDesc: "",
  workerPosition: "", companyName: "", companyRfc: "", courseName: "",
  courseDurationHours: "", periodStartDate: "", periodEndDate: "",
  thematicAreaKey: "", thematicAreaDesc: "", trainingAgentName: "",
  instructorName: "", employerRepName: "", workerRepName: "",
  status: "draft", folioNumber: "", notes: "",
};

function DC3Form({
  form, setForm, catalogs, clientCompanies, onCompanyCreated, companyFromConfig,
}: {
  form: DC3FormData;
  setForm: (f: DC3FormData) => void;
  catalogs: { cnoAreas: { key: string; label: string }[]; thematicAreas: { key: string; label: string }[] } | undefined;
  clientCompanies?: Array<{ id: number; razonSocial: string; rfc?: string | null; isDefault?: boolean | null }>;
  onCompanyCreated?: (company: { id: number; razonSocial: string; rfc?: string | null }) => void;
  companyFromConfig?: { name: string; rfc: string };
}) {
  const { toast } = useToast();
  const set = (field: keyof DC3FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [field]: e.target.value });

  // ── Modal de registro rápido de empresa cliente ──
  const [showQuickCompany, setShowQuickCompany] = useState(false);
  const [quickCompany, setQuickCompany] = useState({ razonSocial: "", rfc: "", representanteLegal: "", domicilioFiscal: "", giro: "" });
  const setQC = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setQuickCompany(prev => ({ ...prev, [field]: e.target.value }));
  const createCompanyMutation = trpc.dc3ClientCompanies.create.useMutation({
    onSuccess: (data) => {
      toast({ title: "Empresa registrada", description: `${data.razonSocial} agregada al catálogo` });
      setForm({ ...form, companyName: data.razonSocial, companyRfc: data.rfc ?? "" });
      onCompanyCreated?.(data);
      setShowQuickCompany(false);
      setQuickCompany({ razonSocial: "", rfc: "", representanteLegal: "", domicilioFiscal: "", giro: "" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ── CURP lookup ──
  const lookupCurpMutation = trpc.dc3.lookupCurp.useMutation({
    onSuccess: (data) => {
      if (!data.found) {
        toast({ title: "CURP inválida", description: data.error ?? "Formato de CURP incorrecto", variant: "destructive" });
        return;
      }
      const updates: Partial<DC3FormData> = {};
      if (data.apiData?.workerName) {
        updates.workerName = data.apiData.workerName;
      } else if (data.employeeData?.workerName) {
        updates.workerName = data.employeeData.workerName;
      }
      if (data.employeeData?.workerPosition) {
        updates.workerPosition = data.employeeData.workerPosition;
      }
      setForm({ ...form, ...updates });
      const source = data.source === "api" ? "API RENAPO" : data.employeeData ? "empleado registrado" : "validación local";
      const genero = data.localData?.genero ?? "";
      const fecha = data.localData?.fechaNacimiento ?? "";
      const estado = data.localData?.estado ?? "";
      toast({
        title: (
          <span className="flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-green-600" />
            CURP válida
          </span>
        ) as any,
        description: [
          updates.workerName ? `Nombre: ${updates.workerName}` : null,
          genero ? `Género: ${genero}` : null,
          fecha ? `Nacimiento: ${fecha}` : null,
          estado ? `Estado: ${estado}` : null,
          `Fuente: ${source}`,
        ].filter(Boolean).join(" · "),
      });
    },
    onError: (e) => toast({ title: "Error al consultar CURP", description: e.message, variant: "destructive" }),
  });

  const handleCurpBlur = useCallback(() => {
    const curp = form.workerCurp.trim().toUpperCase();
    if (curp.length === 18) {
      lookupCurpMutation.mutate({ curp });
    }
  }, [form.workerCurp]);

  // ── RFC validation ──
  const validateRFCMutation = trpc.dc3.validateRFC.useMutation({
    onSuccess: (data) => {
      if (!data.valid) {
        toast({ title: "RFC inválido", description: data.error ?? "El RFC no es válido", variant: "destructive" });
      } else {
        const tipo = data.type === "moral" ? "Persona Moral (12 chars)" : "Persona Física (13 chars)";
        toast({
          title: (
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              RFC válido
            </span>
          ) as any,
          description: `${data.rfcFormatted ?? data.rfc} · ${tipo}`,
        });
      }
    },
    onError: (e) => toast({ title: "Error al validar RFC", description: e.message, variant: "destructive" }),
  });

  const handleRfcBlur = useCallback(() => {
    const rfc = form.companyRfc.trim().toUpperCase();
    if (rfc.length >= 12) {
      validateRFCMutation.mutate({ rfc });
    }
  }, [form.companyRfc]);

  // Estado de validación RFC para mostrar indicador
  const rfcValid = validateRFCMutation.isSuccess && validateRFCMutation.data?.valid;
  const rfcInvalid = validateRFCMutation.isSuccess && !validateRFCMutation.data?.valid;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
      {/* Sección Trabajador */}
      <div className="md:col-span-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 border-b pb-1">
          Datos del Trabajador
        </h3>
      </div>
      {/* P6: Typeahead de empleado */}
      <div className="md:col-span-2">
        <EmployeeTypeahead
          onSelect={(emp) => {
            setForm({
              ...form,
              workerName: `${emp.lastName?.toUpperCase() ?? ""} ${emp.firstName?.toUpperCase() ?? ""}`.trim(),
              workerCurp: emp.curp?.toUpperCase() ?? form.workerCurp,
              workerPosition: emp.positionTitle ?? form.workerPosition,
            });
            if (emp.curp) {
              lookupCurpMutation.mutate({ curp: emp.curp.toUpperCase() });
            }
          }}
        />
      </div>
      <div>
        <Label>Nombre del Trabajador *</Label>
        <Input placeholder="APELLIDO PATERNO APELLIDO MATERNO NOMBRE(S)" value={form.workerName} onChange={set("workerName")} />
      </div>
      <div>
        <Label className="flex items-center gap-1.5">
          CURP
          {lookupCurpMutation.isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {lookupCurpMutation.isSuccess && lookupCurpMutation.data?.found && (
            <UserCheck className="h-3 w-3 text-green-600" />
          )}
        </Label>
        <div className="relative">
          <Input
            placeholder="18 caracteres — al salir del campo se valida automáticamente"
            maxLength={18}
            value={form.workerCurp}
            onChange={(e) => setForm({ ...form, workerCurp: e.target.value.toUpperCase() })}
            onBlur={handleCurpBlur}
            className="uppercase"
          />
          {lookupCurpMutation.isSuccess && lookupCurpMutation.data?.found && lookupCurpMutation.data.localData && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Info className="h-3 w-3" />
              {[
                lookupCurpMutation.data.localData.genero,
                lookupCurpMutation.data.localData.fechaNacimiento,
                lookupCurpMutation.data.localData.estado,
              ].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
      <div>
        <Label>Clave CNO (Ocupación)</Label>
        <Select value={form.workerOccupationCnoKey} onValueChange={(v) => {
          const area = catalogs?.cnoAreas.find((a) => a.key === v);
          setForm({ ...form, workerOccupationCnoKey: v, workerOccupationCnoDesc: area?.label ?? "" });
        }}>
          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>
            {catalogs?.cnoAreas.map((a) => (
              <SelectItem key={a.key} value={a.key}>{a.key} — {a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Descripción Ocupación CNO</Label>
        <Input value={form.workerOccupationCnoDesc} onChange={set("workerOccupationCnoDesc")} />
      </div>
      <div>
        <Label>Puesto</Label>
        <Input placeholder="Puesto del trabajador" value={form.workerPosition} onChange={set("workerPosition")} />
      </div>

      {/* Sección Empresa */}
      <div className="md:col-span-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 border-b pb-1 mt-2">
          Datos de la Empresa
        </h3>
        {/* P2: Selector de empresa del catálogo multi-empresa + botón registro rápido */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground">Seleccionar del catálogo de empresas cliente</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 text-primary hover:text-primary"
              onClick={() => setShowQuickCompany(true)}
            >
              <Plus className="h-3 w-3" />
              Nueva empresa
            </Button>
          </div>
          {clientCompanies && clientCompanies.length > 0 ? (
            <Select
              onValueChange={(val) => {
                if (val === "__manual") return;
                const co = clientCompanies.find((c) => String(c.id) === val);
                if (co) setForm({ ...form, companyName: co.razonSocial, companyRfc: co.rfc ?? "" });
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="— Elegir empresa del catálogo —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual">— Captura manual —</SelectItem>
                {clientCompanies.map((co) => (
                  <SelectItem key={co.id} value={String(co.id)}>
                    {co.isDefault ? "⭐ " : ""}{co.razonSocial}{co.rfc ? ` · ${co.rfc}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No hay empresas en el catálogo. Usa el botón "Nueva empresa" para agregar una.
            </p>
          )}
        </div>

        {/* Modal de registro rápido */}
        <Dialog open={showQuickCompany} onOpenChange={setShowQuickCompany}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Registrar empresa cliente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Razón Social *</Label>
                <Input placeholder="EMPRESA EJEMPLO S.A. DE C.V." value={quickCompany.razonSocial} onChange={setQC("razonSocial")} />
              </div>
              <div>
                <Label>RFC</Label>
                <Input placeholder="EEJ900101AAA" value={quickCompany.rfc} onChange={setQC("rfc")} className="uppercase" />
              </div>
              <div>
                <Label>Representante Legal</Label>
                <Input placeholder="Nombre completo" value={quickCompany.representanteLegal} onChange={setQC("representanteLegal")} />
              </div>
              <div>
                <Label>Domicilio Fiscal</Label>
                <Input placeholder="Calle, núm., colonia, ciudad" value={quickCompany.domicilioFiscal} onChange={setQC("domicilioFiscal")} />
              </div>
              <div>
                <Label>Giro / Actividad</Label>
                <Input placeholder="Manufactura, Servicios, Comercio…" value={quickCompany.giro} onChange={setQC("giro")} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuickCompany(false)}>Cancelar</Button>
              <Button
                disabled={!quickCompany.razonSocial.trim() || createCompanyMutation.isPending}
                onClick={() => createCompanyMutation.mutate({
                  razonSocial: quickCompany.razonSocial.trim(),
                  rfc: quickCompany.rfc.trim().toUpperCase(),
                  representanteLegal: quickCompany.representanteLegal.trim() || undefined,
                  domicilio: quickCompany.domicilioFiscal.trim() || undefined,
                  giro: quickCompany.giro.trim() || undefined,
                })}
              >
                {createCompanyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar y usar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div>
        <Label className="flex items-center gap-1.5">
          Nombre o Razón Social *
          {companyFromConfig && form.companyName === companyFromConfig.name && (
            <span className="text-xs text-green-600 font-normal border border-green-300 bg-green-50 rounded px-1.5 py-0.5">
              Auto-rellenado desde Configuración
            </span>
          )}
        </Label>
        <Input placeholder="EMPRESA EJEMPLO S.A. DE C.V." value={form.companyName} onChange={set("companyName")} />
      </div>
      <div>
        <Label className="flex items-center gap-1.5">
          RFC de la Empresa
          {validateRFCMutation.isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {rfcValid && <ShieldCheck className="h-3 w-3 text-green-600" />}
          {rfcInvalid && <ShieldX className="h-3 w-3 text-destructive" />}
        </Label>
        <div>
          <Input
            placeholder="Con homoclave — al salir del campo se valida"
            maxLength={15}
            value={form.companyRfc}
            onChange={(e) => {
              setForm({ ...form, companyRfc: e.target.value.toUpperCase() });
              // Resetear estado de validación al editar
              if (validateRFCMutation.isSuccess || validateRFCMutation.isError) {
                validateRFCMutation.reset();
              }
            }}
            onBlur={handleRfcBlur}
            className={`uppercase ${rfcValid ? "border-green-500 focus-visible:ring-green-500" : rfcInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {rfcValid && validateRFCMutation.data?.rfcFormatted && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {validateRFCMutation.data.rfcFormatted} · {validateRFCMutation.data.type === "moral" ? "Persona Moral" : "Persona Física"}
            </p>
          )}
          {rfcInvalid && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <ShieldX className="h-3 w-3" />
              {validateRFCMutation.data?.error ?? "RFC inválido"}
            </p>
          )}
        </div>
      </div>

      {/* Sección Curso */}
      <div className="md:col-span-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 border-b pb-1 mt-2">
          Datos del Programa de Capacitación
        </h3>
      </div>
      <div className="md:col-span-2">
        <Label>Nombre del Curso *</Label>
        <Input placeholder="Nombre completo del curso o programa" value={form.courseName} onChange={set("courseName")} />
      </div>
      <div>
        <Label>Duración (horas)</Label>
        <Input type="number" min={1} placeholder="Ej. 16" value={form.courseDurationHours} onChange={set("courseDurationHours")} />
      </div>
      <div>
        <Label>Agente Capacitador / STPS</Label>
        <Input placeholder="Nombre del agente o empresa capacitadora" value={form.trainingAgentName} onChange={set("trainingAgentName")} />
      </div>
      <div>
        <Label>Fecha de Inicio</Label>
        <Input type="date" value={form.periodStartDate} onChange={set("periodStartDate")} />
      </div>
      <div>
        <Label>Fecha de Término</Label>
        <Input type="date" value={form.periodEndDate} onChange={set("periodEndDate")} />
      </div>
      <div>
        <Label>Área Temática</Label>
        <Select value={form.thematicAreaKey} onValueChange={(v) => {
          const area = catalogs?.thematicAreas.find((a) => a.key === v);
          setForm({ ...form, thematicAreaKey: v, thematicAreaDesc: area?.label ?? "" });
        }}>
          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>
            {catalogs?.thematicAreas.map((a) => (
              <SelectItem key={a.key} value={a.key}>{a.key} — {a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Descripción Área Temática</Label>
        <Input value={form.thematicAreaDesc} onChange={set("thematicAreaDesc")} />
      </div>

      {/* Firmantes */}
      <div className="md:col-span-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 border-b pb-1 mt-2">
          Firmantes
        </h3>
      </div>
      <div>
        <Label>Instructor o Tutor</Label>
        <Input placeholder="Nombre completo" value={form.instructorName} onChange={set("instructorName")} />
      </div>
      <div>
        <Label>Patrón o Representante Legal</Label>
        <Input placeholder="Nombre completo" value={form.employerRepName} onChange={set("employerRepName")} />
      </div>
      <div>
        <Label>Representante de los Trabajadores</Label>
        <Input placeholder="Solo para empresas &gt;50 trabajadores" value={form.workerRepName} onChange={set("workerRepName")} />
      </div>

      {/* Estado y folio */}
      <div className="md:col-span-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 border-b pb-1 mt-2">
          Estado y Folio
        </h3>
      </div>
      <div>
        <Label>Estado</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as DC3FormData["status"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="issued">Emitida</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Folio (auto-generado al emitir)</Label>
        <Input placeholder="DC3-0001/2025" value={form.folioNumber} onChange={set("folioNumber")} />
      </div>
      <div className="md:col-span-2">
        <Label>Notas</Label>
        <Textarea rows={2} value={form.notes} onChange={set("notes")} />
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function DC3Manager() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros básicos
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "issued" | "cancelled">("all");
  const [page, setPage] = useState(1);

  // Filtros avanzados
  const [companyFilter, setCompanyFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [thematicAreaFilter, setThematicAreaFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<DC3FormData>(emptyForm);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showImportResult, setShowImportResult] = useState(false);

  // P1: Datos de empresa desde Configuración para prellenar formulario
  const companyInfoQuery = trpc.systemSettings.getCompanyInfo.useQuery(undefined, { staleTime: 60_000 });
  // P2: Catálogo de empresas cliente para selector multi-empresa
  const clientCompaniesQuery = trpc.dc3ClientCompanies.list.useQuery(undefined, { staleTime: 60_000 });
  const clientCompanies = clientCompaniesQuery.data ?? [];

  const catalogsQuery = trpc.dc3.getCatalogs.useQuery();

  const listQuery = trpc.dc3.list.useQuery(
    {
      page,
      pageSize: 20,
      search: search || undefined,
      status: statusFilter,
      companyFilter: companyFilter || undefined,
      courseFilter: courseFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      thematicAreaFilter: thematicAreaFilter !== "all" ? thematicAreaFilter : undefined,
    },
    { staleTime: 5000 }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.dc3.create.useMutation({
    onSuccess: () => {
      toast({ title: "Registro DC-3 creado", description: "La constancia fue guardada correctamente." });
      utils.dc3.list.invalidate();
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e) => toast({ title: "Error al crear", description: e.message, variant: "destructive" }),
  });

  const updateMutation = trpc.dc3.update.useMutation({
    onSuccess: () => {
      toast({ title: "Registro actualizado" });
      utils.dc3.list.invalidate();
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast({ title: "Error al actualizar", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = trpc.dc3.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Registro eliminado" });
      utils.dc3.list.invalidate();
    },
    onError: (e) => toast({ title: "Error al eliminar", description: e.message, variant: "destructive" }),
  });

  const templateMutation = trpc.dc3.downloadTemplate.useMutation({
    onSuccess: (data) => {
      downloadBase64(data.data, data.filename, data.contentType);
      toast({ title: "Plantilla descargada", description: "Abra el archivo en Excel para llenar los datos." });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const exportMutation = trpc.dc3.exportToExcel.useMutation({
    onSuccess: (data) => {
      downloadBase64(data.data, data.filename, data.contentType);
      toast({ title: `${data.count} registros exportados`, description: data.filename });
    },
    onError: (e) => toast({ title: "Error al exportar", description: e.message, variant: "destructive" }),
  });

  const importMutation = trpc.dc3.importFromExcel.useMutation({
    onSuccess: (data) => {
      setImportErrors(data.errors);
      setShowImportResult(true);
      utils.dc3.list.invalidate();
      toast({
        title: `Importación completada`,
        description: `${data.imported} registros importados${data.errors.length > 0 ? `, ${data.errors.length} errores` : ""}`,
        variant: data.errors.length > 0 ? "destructive" : "default",
      });
    },
    onError: (e) => toast({ title: "Error al importar", description: e.message, variant: "destructive" }),
  });

  // ── Exportar SIRCE XML ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exportingSirce, setExportingSirce] = useState(false);
  const exportSirceMutation = trpc.dc3.exportSirceXml.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.xml], { type: "application/xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "XML SIRCE generado", description: `${data.count} constancias exportadas al formato SIRCE-STPS.` });
      setExportingSirce(false);
    },
    onError: (e) => {
      toast({ title: "Error al exportar SIRCE", description: e.message, variant: "destructive" });
      setExportingSirce(false);
    },
  });

  // ── Exportar PDF individual ──
  const [exportingPdfId, setExportingPdfId] = useState<number | null>(null);
  // ── Visor PDF ──
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfViewerData, setPdfViewerData] = useState<{ base64: string; folio: string } | null>(null);
  const [previewingPdfId, setPreviewingPdfId] = useState<number | null>(null);
  const exportPdfMutation = trpc.dc3.exportToPdf.useMutation({
    onSuccess: (data) => {
      downloadBase64(data.pdfBase64, `DC3-${data.folioNumber}.pdf`, "application/pdf");
      toast({ title: "PDF generado", description: `Constancia ${data.folioNumber} descargada.` });
      setExportingPdfId(null);
    },
    onError: (e) => {
      toast({ title: "Error al generar PDF", description: e.message, variant: "destructive" });
      setExportingPdfId(null);
    },
  });
  const previewPdfMutation = trpc.dc3.exportToPdf.useMutation({
    onSuccess: (data) => {
      setPdfViewerData({ base64: data.pdfBase64, folio: data.folioNumber });
      setPdfViewerOpen(true);
      setPreviewingPdfId(null);
    },
    onError: (e) => {
      toast({ title: "Error al previsualizar", description: e.message, variant: "destructive" });
      setPreviewingPdfId(null);
    },
  });

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      importMutation.mutate({ fileBase64: base64, fileName: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [importMutation]);

  const handleEdit = (record: NonNullable<typeof listQuery.data>["records"][number]) => {
    setEditId(record.id);
    setForm({
      workerName: record.workerName,
      workerCurp: record.workerCurp ?? "",
      workerOccupationCnoKey: record.workerOccupationCnoKey ?? "",
      workerOccupationCnoDesc: record.workerOccupationCnoDesc ?? "",
      workerPosition: record.workerPosition ?? "",
      companyName: record.companyName,
      companyRfc: record.companyRfc ?? "",
      courseName: record.courseName,
      courseDurationHours: record.courseDurationHours ? String(record.courseDurationHours) : "",
      periodStartDate: record.periodStartDate ? String(record.periodStartDate).slice(0, 10) : "",
      periodEndDate: record.periodEndDate ? String(record.periodEndDate).slice(0, 10) : "",
      thematicAreaKey: record.thematicAreaKey ?? "",
      thematicAreaDesc: record.thematicAreaDesc ?? "",
      trainingAgentName: record.trainingAgentName ?? "",
      instructorName: record.instructorName ?? "",
      employerRepName: record.employerRepName ?? "",
      workerRepName: record.workerRepName ?? "",
      status: record.status,
      folioNumber: record.folioNumber ?? "",
      notes: record.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      courseDurationHours: form.courseDurationHours ? parseInt(form.courseDurationHours) : null,
      workerCurp: form.workerCurp || null,
      workerOccupationCnoKey: form.workerOccupationCnoKey || null,
      workerOccupationCnoDesc: form.workerOccupationCnoDesc || null,
      workerPosition: form.workerPosition || null,
      companyRfc: form.companyRfc || null,
      periodStartDate: form.periodStartDate || null,
      periodEndDate: form.periodEndDate || null,
      thematicAreaKey: form.thematicAreaKey || null,
      thematicAreaDesc: form.thematicAreaDesc || null,
      trainingAgentName: form.trainingAgentName || null,
      instructorName: form.instructorName || null,
      employerRepName: form.employerRepName || null,
      workerRepName: form.workerRepName || null,
      folioNumber: form.folioNumber || null,
      notes: form.notes || null,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const resetAdvancedFilters = () => {
    setCompanyFilter("");
    setCourseFilter("");
    setDateFrom("");
    setDateTo("");
    setThematicAreaFilter("all");
    setPage(1);
  };

  const hasAdvancedFilters = companyFilter || courseFilter || dateFrom || dateTo || thematicAreaFilter !== "all";

  const records = listQuery.data?.records ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  // ── Selección múltiple para SIRCE (depende de records) ──
  const selectableIds = useMemo(
    () => records.filter((r) => r.status === "issued").map((r) => r.id),
    [records]
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectableIds.some((id) => selectedIds.has(id)) && !allSelected;
  const selectedCount = selectableIds.filter((id) => selectedIds.has(id)).length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión DC-3</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Constancia de Competencias o Habilidades Laborales — Formato oficial STPS
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => templateMutation.mutate()} disabled={templateMutation.isPending}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Descargar Plantilla
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
            <Upload className="w-4 h-4 mr-2" />
            {importMutation.isPending ? "Importando..." : "Importar Excel"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportMutation.mutate({ status: statusFilter })} disabled={exportMutation.isPending}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            title="Exportar constancias emitidas en formato XML para carga en SIRCE-STPS"
            onClick={() => {
              setExportingSirce(true);
              const ids = selectedCount > 0
                ? selectableIds.filter((id) => selectedIds.has(id))
                : undefined;
              exportSirceMutation.mutate({ ids });
            }}
            disabled={exportingSirce || exportSirceMutation.isPending}
          >
            {exportingSirce ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ListChecks className="w-4 h-4 mr-2" />}
            {selectedCount > 0 ? `Exportar SIRCE (${selectedCount})` : "Exportar SIRCE"}
          </Button>
          <Button size="sm" onClick={() => {
            setEditId(null);
            // P1: Prellenar empresa desde Configuración
            const ci = companyInfoQuery.data;
            setForm({
              ...emptyForm,
              companyName: ci?.company_name ?? "",
              companyRfc: ci?.company_rfc ?? "",
            });
            setShowForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Registro
          </Button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />

      {/* Resultado de importación */}
      {showImportResult && importErrors.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              Errores en la importación ({importErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {importErrors.map((e, i) => <li key={i} className="text-destructive">• {e}</li>)}
            </ul>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowImportResult(false)}>Cerrar</Button>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="space-y-3">
        {/* Fila de filtros básicos */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por trabajador, curso, empresa o folio..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="issued">Emitidas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showAdvancedFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            Filtros avanzados
            {hasAdvancedFilters && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-primary text-primary-foreground">
                {[companyFilter, courseFilter, dateFrom, dateTo, thematicAreaFilter !== "all" ? thematicAreaFilter : ""].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Fila de filtros avanzados */}
        {showAdvancedFilters && (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Empresa</Label>
                  <Input
                    placeholder="Filtrar por empresa..."
                    value={companyFilter}
                    onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Curso</Label>
                  <Input
                    placeholder="Filtrar por curso..."
                    value={courseFilter}
                    onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Fecha desde</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Fecha hasta</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Área Temática</Label>
                  <Select value={thematicAreaFilter} onValueChange={(v) => { setThematicAreaFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {catalogsQuery.data?.thematicAreas.map((a) => (
                        <SelectItem key={a.key} value={a.key}>{a.key} — {a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasAdvancedFilters && (
                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs text-muted-foreground" onClick={resetAdvancedFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Limpiar filtros avanzados
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Barra de selección flotante */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border shadow-lg rounded-full px-5 py-2.5 text-sm">
          <ListChecks className="w-4 h-4 text-primary" />
          <span className="font-medium">{selectedCount} constancia{selectedCount !== 1 ? "s" : ""} seleccionada{selectedCount !== 1 ? "s" : ""}</span>
          <Button
            size="sm"
            className="h-7 rounded-full"
            disabled={exportingSirce}
            onClick={() => {
              setExportingSirce(true);
              exportSirceMutation.mutate({ ids: selectableIds.filter((id) => selectedIds.has(id)) });
            }}
          >
            {exportingSirce ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5 mr-1.5" />}
            Exportar SIRCE
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-full text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Limpiar
          </Button>
        </div>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Registros DC-3
            {total > 0 && <Badge variant="secondary">{total}</Badge>}
          </CardTitle>
          <CardDescription>
            Constancias de capacitación para exportar al sistema SIRCE-STPS
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando registros...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No hay registros DC-3</p>
              <p className="text-sm text-muted-foreground mt-1">
                Descargue la plantilla Excel, llene los datos y use "Importar Excel", o agregue un registro manualmente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Seleccionar todas las emitidas"
                        disabled={selectableIds.length === 0}
                      />
                    </TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Hrs</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow
                      key={r.id}
                      className={selectedIds.has(r.id) ? "bg-primary/5" : undefined}
                    >
                      <TableCell className="pl-4">
                        {r.status === "issued" ? (
                          <Checkbox
                            checked={selectedIds.has(r.id)}
                            onCheckedChange={() => toggleSelectRow(r.id)}
                            aria-label={`Seleccionar ${r.folioNumber ?? r.id}`}
                          />
                        ) : (
                          <span className="w-4 h-4 block" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.folioNumber ?? `#${r.id}`}</TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate">{r.workerName}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">{r.companyName}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{r.courseName}</TableCell>
                      <TableCell className="text-center">{r.courseDurationHours ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.periodStartDate ? String(r.periodStartDate).slice(0, 10) : "—"}
                        {r.periodEndDate ? ` → ${String(r.periodEndDate).slice(0, 10)}` : ""}
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Botón Vista Previa PDF */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title="Vista previa PDF"
                            disabled={previewingPdfId === r.id}
                            onClick={() => {
                              setPreviewingPdfId(r.id);
                              previewPdfMutation.mutate({ id: r.id });
                            }}
                          >
                            {previewingPdfId === r.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Eye className="w-3.5 h-3.5" />
                            }
                          </Button>
                          {/* Botón PDF Descargar */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Descargar PDF"
                            disabled={exportingPdfId === r.id}
                            onClick={() => {
                              setExportingPdfId(r.id);
                              exportPdfMutation.mutate({ id: r.id });
                            }}
                          >
                            {exportingPdfId === r.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <FileText className="w-3.5 h-3.5" />
                            }
                          </Button>
                          {/* Botón Editar */}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {/* Botón Eliminar */}
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("¿Eliminar este registro DC-3?")) deleteMutation.mutate({ id: r.id }); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {totalPages} — {total} registros</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <Tabs defaultValue="flujo">
        <TabsList>
          <TabsTrigger value="flujo">Flujo de trabajo</TabsTrigger>
          <TabsTrigger value="campos">Campos del formato</TabsTrigger>
          <TabsTrigger value="legal">Notas legales</TabsTrigger>
        </TabsList>
        <TabsContent value="flujo">
          <Card>
            <CardContent className="pt-4 text-sm space-y-2">
              <p className="flex items-start gap-2"><span className="font-bold text-primary">1.</span> Descargue la <strong>Plantilla Excel</strong> — contiene 4 hojas: datos, catálogo CNO, áreas temáticas e instrucciones.</p>
              <p className="flex items-start gap-2"><span className="font-bold text-primary">2.</span> Llene los datos en la hoja <strong>"DC-3 Datos"</strong> usando los catálogos de las hojas de referencia.</p>
              <p className="flex items-start gap-2"><span className="font-bold text-primary">3.</span> Use <strong>"Importar Excel"</strong> para cargar el archivo. Los errores por fila se mostrarán en pantalla.</p>
              <p className="flex items-start gap-2"><span className="font-bold text-primary">4.</span> Cambie el estado a <strong>"Emitida"</strong> para generar el folio automático DC3-XXXX/AAAA.</p>
              <p className="flex items-start gap-2"><span className="font-bold text-primary">5.</span> Use el botón <strong>PDF</strong> (ícono azul) en cada fila para descargar la constancia individual en PDF.</p>
              <p className="flex items-start gap-2"><span className="font-bold text-primary">6.</span> Use <strong>"Exportar Excel"</strong> para descargar todos los registros y subirlos al sistema externo (SIRCE-STPS).</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="campos">
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {[
                  ["Nombre del Trabajador *", "Apellido paterno, apellido materno y nombre(s)"],
                  ["CURP", "18 caracteres — Clave Única de Registro de Población"],
                  ["Clave CNO", "Catálogo Nacional de Ocupaciones STPS — ver catálogo"],
                  ["Puesto", "Cargo que desempeña el trabajador en la empresa"],
                  ["Nombre o Razón Social *", "Persona física: apellidos y nombre(s)"],
                  ["RFC", "Con homoclave — Servicio de Administración Tributaria"],
                  ["Nombre del Curso *", "Nombre completo del programa de capacitación"],
                  ["Duración", "Total de horas del curso (número entero)"],
                  ["Período", "Fecha de inicio y término del curso (YYYY-MM-DD)"],
                  ["Área Temática", "Clave del catálogo STPS de áreas temáticas"],
                  ["Agente Capacitador", "Nombre del agente o empresa que impartió el curso"],
                  ["Instructor", "Nombre del instructor o tutor del curso"],
                  ["Patrón / Rep. Legal", "Nombre del patrón o representante legal de la empresa"],
                  ["Rep. Trabajadores", "Solo para empresas con más de 50 trabajadores"],
                ].map(([campo, desc]) => (
                  <div key={campo} className="border rounded p-2">
                    <p className="font-medium text-xs">{campo}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="legal">
          <Card>
            <CardContent className="pt-4 text-sm space-y-2 text-muted-foreground">
              <p>• La constancia debe entregarse al trabajador dentro de los <strong>20 días hábiles</strong> siguientes al término del curso.</p>
              <p>• Los datos se asientan bajo <strong>protesta de decir verdad</strong>.</p>
              <p>• Para empresas con más de 50 trabajadores, firma el representante de los trabajadores ante la <strong>Comisión Mixta de Capacitación</strong>.</p>
              <p>• El formato DC-3 es el documento oficial para acreditar la capacitación ante la <strong>STPS</strong> y el <strong>IMSS</strong>.</p>
              <p>• Los registros deben conservarse por un mínimo de <strong>2 años</strong> conforme a la NOM-035-STPS-2018.</p>
              <p className="text-xs">Fuente: Formato DC-3 oficial STPS — <a href="https://www.stps.gob.mx" target="_blank" rel="noopener noreferrer" className="text-primary underline">www.stps.gob.mx</a></p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Formulario */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Registro DC-3" : "Nuevo Registro DC-3"}</DialogTitle>
          </DialogHeader>
          <DC3Form
            form={form}
            setForm={setForm}
            catalogs={catalogsQuery.data}
            clientCompanies={clientCompanies}
            companyFromConfig={companyInfoQuery.data ? { name: companyInfoQuery.data.company_name ?? "", rfc: companyInfoQuery.data.company_rfc ?? "" } : undefined}
          />

          {/* Panel de firmas digitales — solo visible al editar un registro existente */}
          {editId && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 border-b pb-2">
                <PenLine className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Firmas Digitales
                </h3>
              </div>
              <DC3SignaturePanel
                dc3Id={editId}
                instructorName={form.instructorName || undefined}
                employerRepName={form.employerRepName || undefined}
                workerRepName={form.workerRepName || undefined}
              />
            </div>
          )}

          {!editId && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Guarde el registro primero para poder capturar las firmas digitales.
            </p>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Guardando..." : editId ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visor PDF integrado */}
      <PDFViewer
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        pdfBase64={pdfViewerData?.base64}
        filename={`DC3-${pdfViewerData?.folio ?? 'constancia'}.pdf`}
        title={`Constancia DC-3 — Folio ${pdfViewerData?.folio ?? ''}`}
        loading={previewPdfMutation.isPending}
      />
    </div>
  );
}

export default DC3Manager;
