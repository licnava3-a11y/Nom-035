import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  ShieldX,
  Loader2,
  FileText,
  Search,
  Building2,
  User,
  BookOpen,
  CalendarDays,
  PenLine,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === "issued")
    return <Badge className="bg-green-100 text-green-800 border-green-200">Emitida</Badge>;
  if (status === "cancelled")
    return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelada</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Borrador</Badge>;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DC3Verify() {
  // Leer el hash desde la query string (?hash=...)
  const params = new URLSearchParams(window.location.search);
  const hashFromUrl = params.get("hash") ?? "";

  const [inputHash, setInputHash] = useState(hashFromUrl);
  const [queryHash, setQueryHash] = useState(hashFromUrl);

  // Disparar la consulta solo cuando queryHash tiene valor
  const verifyQuery = trpc.dc3.verify.useQuery(
    { hash: queryHash },
    { enabled: queryHash.trim().length > 0, staleTime: 60_000 }
  );

  // Sincronizar URL cuando el usuario escribe un hash manualmente
  useEffect(() => {
    if (queryHash) {
      const url = new URL(window.location.href);
      url.searchParams.set("hash", queryHash);
      window.history.replaceState({}, "", url.toString());
    }
  }, [queryHash]);

  const handleSearch = () => {
    const trimmed = inputHash.trim();
    if (trimmed.length > 0) setQueryHash(trimmed);
  };

  const record = verifyQuery.data?.found ? verifyQuery.data.record : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-start py-12 px-4">
      {/* Encabezado */}
      <div className="text-center mb-8 max-w-xl">
        <div className="flex justify-center mb-3">
          <div className="bg-primary/10 rounded-full p-3">
            <FileText className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Verificación de Constancia DC-3</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Ingrese el código de verificación impreso en la constancia para confirmar su autenticidad.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Plataforma NOM-035-STPS-2018 — Formato oficial STPS
        </p>
      </div>

      {/* Buscador de hash */}
      <Card className="w-full max-w-xl mb-6">
        <CardContent className="pt-5">
          <div className="flex gap-2">
            <Input
              placeholder="Código de verificación SHA-256 (64 caracteres)"
              value={inputHash}
              onChange={(e) => setInputHash(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="font-mono text-xs"
            />
            <Button onClick={handleSearch} disabled={verifyQuery.isFetching}>
              {verifyQuery.isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            El código aparece en el pie de página del PDF, junto al QR de verificación.
          </p>
        </CardContent>
      </Card>

      {/* Estado: cargando */}
      {verifyQuery.isFetching && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Consultando base de datos…</span>
        </div>
      )}

      {/* Estado: error de red */}
      {verifyQuery.isError && !verifyQuery.isFetching && (
        <Card className="w-full max-w-xl border-red-200 bg-red-50">
          <CardContent className="pt-5 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Error al consultar</p>
              <p className="text-red-700 text-xs mt-0.5">{verifyQuery.error?.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado: no encontrado */}
      {verifyQuery.data && !verifyQuery.data.found && !verifyQuery.isFetching && (
        <Card className="w-full max-w-xl border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <ShieldX className="w-5 h-5" />
              Constancia no encontrada
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-700 space-y-2">
            <p>
              El código de verificación proporcionado <strong>no corresponde a ninguna constancia DC-3</strong> registrada en este sistema.
            </p>
            <p className="text-xs">
              Posibles causas: el código fue alterado, la constancia fue emitida en otro sistema, o el PDF es apócrifo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Estado: encontrado */}
      {verifyQuery.data?.found && record && !verifyQuery.isFetching && (
        <div className="w-full max-w-xl space-y-4">
          {/* Banner de autenticidad */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-green-800">Constancia Auténtica</p>
                <p className="text-green-700 text-xs mt-0.5">
                  Esta constancia fue emitida por el sistema NOM-035 y sus datos son íntegros.
                </p>
              </div>
              <div className="ml-auto">{statusBadge(record.status)}</div>
            </CardContent>
          </Card>

          {/* Datos del trabajador */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                Datos del Trabajador
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Field label="Nombre" value={record.workerName} />
              <Field label="CURP" value={record.workerCurp} />
            </CardContent>
          </Card>

          {/* Datos de la empresa */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Field label="Nombre o Razón Social" value={record.companyName} />
              <Field label="RFC" value={record.companyRfc} />
            </CardContent>
          </Card>

          {/* Datos del curso */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                Programa de Capacitación
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Nombre del Curso" value={record.courseName} />
              </div>
              <Field label="Duración" value={record.courseDurationHours ? `${record.courseDurationHours} horas` : null} />
              <Field label="Área Temática" value={record.thematicAreaKey ? `${record.thematicAreaKey} — ${record.thematicAreaDesc ?? ""}` : null} />
            </CardContent>
          </Card>

          {/* Período */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                Período
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Field
                label="Inicio"
                value={record.periodStartDate ? String(record.periodStartDate).slice(0, 10) : null}
              />
              <Field
                label="Término"
                value={record.periodEndDate ? String(record.periodEndDate).slice(0, 10) : null}
              />
            </CardContent>
          </Card>

          {/* Firmantes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <PenLine className="w-4 h-4" />
                Firmantes
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2">
                {record.instructorSignatureUrl ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <Field label="Instructor o Tutor" value={record.instructorName} />
              </div>
              <div className="flex items-center gap-2">
                {record.employerSignatureUrl ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <Field label="Patrón o Rep. Legal" value={record.employerRepName} />
              </div>
              <div className="flex items-center gap-2">
                {record.workerRepSignatureUrl ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <Field label="Rep. de Trabajadores" value={record.workerRepName} />
              </div>
            </CardContent>
          </Card>

          {/* Folio y hash */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Folio:</span>
                <span className="font-mono">{record.folioNumber ?? `DC3-${record.id}`}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Registrado:</span>
                <span>{new Date(record.createdAt).toLocaleDateString("es-MX")}</span>
              </div>
              <div className="flex items-start justify-between text-xs text-muted-foreground gap-2">
                <span className="font-medium shrink-0">Hash SHA-256:</span>
                <span className="font-mono break-all text-right">{record.verificationHash}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pie de página */}
      <p className="text-xs text-muted-foreground mt-10 text-center">
        Plataforma NOM-035-STPS-2018 · Verificación de autenticidad de constancias DC-3
      </p>
    </div>
  );
}
