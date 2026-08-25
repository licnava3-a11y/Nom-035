import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Eye,
  MessageSquare,
} from "lucide-react";

// ─── Etiquetas de tipo de solicitud ─────────────────────────────────────────
const REQUEST_TYPE_LABELS: Record<string, string> = {
  QUEJA: "Queja / Denuncia",
  FELICITACION: "Felicitación",
  CAPACITACION: "Solicitud de Capacitación (DNC)",
  SUGERENCIA: "Sugerencia",
};

// ─── Etiquetas y colores de estado ──────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  REGISTRADA: {
    label: "Registrada",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  EN_ANALISIS: {
    label: "En Análisis",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <Search className="h-3.5 w-3.5" />,
  },
  EN_INVESTIGACION: {
    label: "En Investigación",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  PENDIENTE_ACLARACION: {
    label: "Pendiente de Aclaración",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  RESUELTA: {
    label: "Resuelta",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  NOTIFICADA: {
    label: "Notificada",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
  },
};

// ─── Orden de estados para la línea de tiempo ────────────────────────────────
const STATUS_ORDER = [
  "REGISTRADA",
  "EN_ANALISIS",
  "EN_INVESTIGACION",
  "RESUELTA",
  "NOTIFICADA",
];

export default function BuzonConsulta() {
  const [folioInput, setFolioInput] = useState("");
  const [searchFolio, setSearchFolio] = useState("");

  const { data, isLoading, error, refetch } = trpc.buzon.lookupByFolio.useQuery(
    { folio: searchFolio },
    {
      enabled: searchFolio.length > 0,
      retry: false,
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folioInput.trim().toUpperCase();
    if (trimmed) {
      setSearchFolio(trimmed);
    }
  };

  const statusCfg = data?.request
    ? (STATUS_CONFIG[data.request.status] ?? STATUS_CONFIG["REGISTRADA"])
    : null;

  const currentStatusIndex = data?.request
    ? STATUS_ORDER.indexOf(data.request.status)
    : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header público */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">
              Portal de Consulta — Buzón Interno
            </h1>
            <p className="text-xs text-muted-foreground">
              NOM-035 STPS 2018 · Consulta confidencial
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 space-y-8">
        {/* Aviso de confidencialidad */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">
                  Consulta confidencial y anónima
                </p>
                <p className="text-blue-700">
                  Esta página te permite conocer el estado de tu solicitud
                  usando únicamente el folio que recibiste al momento del
                  registro. No se exponen datos personales ni información
                  interna.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Consultar estado de solicitud
            </CardTitle>
            <CardDescription>
              Ingresa el folio que recibiste al enviar tu solicitud (ej:
              QUE-2026-0001)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="folio" className="sr-only">
                  Folio de solicitud
                </Label>
                <Input
                  id="folio"
                  placeholder="Ej: QUE-2026-0001"
                  value={folioInput}
                  onChange={e => setFolioInput(e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                  maxLength={20}
                />
              </div>
              <Button type="submit" disabled={!folioInput.trim() || isLoading}>
                {isLoading ? "Buscando..." : "Consultar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error: no encontrado */}
        {error && searchFolio && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Folio no encontrado</p>
                  <p className="text-sm text-red-600 mt-0.5">
                    No se encontró ninguna solicitud con el folio{" "}
                    <strong>{searchFolio}</strong>. Verifica que el folio esté
                    escrito correctamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado */}
        {data && (
          <div className="space-y-6">
            {/* Resumen de la solicitud */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-mono">
                      {data.request.publicFolio}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {REQUEST_TYPE_LABELS[data.request.requestType] ??
                        data.request.requestType}
                    </CardDescription>
                  </div>
                  {statusCfg && (
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium ${statusCfg.color}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Fecha de registro</p>
                    <p className="font-medium">
                      {new Date(data.request.createdAt).toLocaleDateString(
                        "es-MX",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Última actualización
                    </p>
                    <p className="font-medium">
                      {new Date(data.request.updatedAt).toLocaleDateString(
                        "es-MX",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                  {data.request.resolvedAt && (
                    <div>
                      <p className="text-muted-foreground">
                        Fecha de resolución
                      </p>
                      <p className="font-medium text-green-700">
                        {new Date(data.request.resolvedAt).toLocaleDateString(
                          "es-MX",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {data.request.resolutionText && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Resolución comunicada
                      </p>
                      <p className="text-sm bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
                        {data.request.resolutionText}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Línea de tiempo de estados */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Progreso de la solicitud
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Barra de progreso de estados */}
                <div className="flex items-center gap-1 mb-6">
                  {STATUS_ORDER.map((status, idx) => {
                    const isCompleted = idx <= currentStatusIndex;
                    const isCurrent = idx === currentStatusIndex;
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <div key={status} className="flex items-center flex-1">
                        <div
                          className={`flex flex-col items-center gap-1 flex-1 ${
                            isCompleted ? "opacity-100" : "opacity-40"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                              isCurrent
                                ? "border-primary bg-primary text-white scale-110"
                                : isCompleted
                                  ? "border-green-500 bg-green-500 text-white"
                                  : "border-gray-300 bg-white text-gray-400"
                            }`}
                          >
                            {isCompleted && !isCurrent ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-bold">
                                {idx + 1}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-center leading-tight max-w-[60px]">
                            {cfg?.label ?? status}
                          </span>
                        </div>
                        {idx < STATUS_ORDER.length - 1 && (
                          <div
                            className={`h-0.5 flex-1 mx-1 rounded ${
                              idx < currentStatusIndex
                                ? "bg-green-400"
                                : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Historial de movimientos */}
                {data.auditHistory.length > 0 && (
                  <>
                    <Separator className="mb-4" />
                    <p className="text-sm font-medium text-muted-foreground mb-3">
                      Historial de movimientos
                    </p>
                    <div className="space-y-3">
                      {data.auditHistory.map((entry, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 text-sm"
                        >
                          <div className="mt-1 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-primary/60" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {entry.fromStatus &&
                                entry.fromStatus !== entry.toStatus && (
                                  <>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {STATUS_CONFIG[entry.fromStatus]?.label ??
                                        entry.fromStatus}
                                    </Badge>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  </>
                                )}
                              <Badge
                                variant="outline"
                                className={`text-xs ${STATUS_CONFIG[entry.toStatus]?.color ?? ""}`}
                              >
                                {STATUS_CONFIG[entry.toStatus]?.label ??
                                  entry.toStatus}
                              </Badge>
                            </div>
                            {entry.systemNote && (
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                {entry.systemNote}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(entry.createdAt).toLocaleString(
                                "es-MX"
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4 text-center text-xs text-muted-foreground">
        Portal de Consulta Confidencial · NOM-035 STPS 2018 · Los datos
        personales están protegidos
      </footer>
    </div>
  );
}
