import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  History,
  Download,
  RefreshCw,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function formatDateTime(ts: Date | string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateHash(hash: string): string {
  return hash.slice(0, 8) + "…" + hash.slice(-8);
}

export default function SirceExportHistory() {
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [errorDialog, setErrorDialog] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.dc3.listSirceExports.useQuery(
    { page, pageSize: PAGE_SIZE },
    { refetchOnWindowFocus: false }
  );

  const redownloadMutation = trpc.dc3.redownloadSirceExport.useMutation({
    onSuccess: (result) => {
      // Abrir la URL de descarga en una nueva pestaña
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Descargando ${result.filename}`);
    },
    onError: (err) => {
      setErrorDialog(err.message);
    },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const handleCopyHash = (id: number, hash: string) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedId(id);
      toast.success("Hash copiado al portapapeles");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Historial de Exportaciones SIRCE
              </h1>
              <p className="text-sm text-muted-foreground">
                Registro de todos los archivos XML generados para el Sistema de Registro de
                Constancias de Empresas (SIRCE-STPS)
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileCode2 className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{data?.total ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">Exportaciones totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {data?.exports.filter((e) => e.fileKey).length ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Disponibles para re-descarga</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Download className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {data?.exports.reduce((sum, e) => sum + e.recordCount, 0) ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Constancias exportadas (esta página)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de historial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registro de exportaciones</CardTitle>
            <CardDescription>
              Cada fila corresponde a un archivo XML generado. Los archivos se almacenan durante
              90 días en el servidor.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Cargando historial…
              </div>
            ) : !data || data.exports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <History className="h-12 w-12 opacity-30" />
                <p className="text-sm">No hay exportaciones registradas aún.</p>
                <p className="text-xs">
                  Las exportaciones aparecerán aquí después de generar el primer archivo SIRCE
                  desde el módulo DC-3.
                </p>
              </div>
            ) : (
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] text-center">#</TableHead>
                      <TableHead>Archivo</TableHead>
                      <TableHead className="text-center">Constancias</TableHead>
                      <TableHead>Exportado por</TableHead>
                      <TableHead>Fecha y hora</TableHead>
                      <TableHead>Hash SHA-256</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.exports.map((exp) => (
                      <TableRow key={exp.id} className="hover:bg-muted/30">
                        {/* ID */}
                        <TableCell className="text-center text-muted-foreground text-xs font-mono">
                          {exp.id}
                        </TableCell>

                        {/* Nombre del archivo */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileCode2 className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="font-mono text-xs break-all">{exp.filename}</span>
                          </div>
                          {exp.companyRfc && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                              RFC: {exp.companyRfc}
                            </p>
                          )}
                        </TableCell>

                        {/* Cantidad de constancias */}
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-mono">
                            {exp.recordCount}
                          </Badge>
                        </TableCell>

                        {/* Usuario exportador */}
                        <TableCell>
                          <span className="text-sm">
                            {exp.exportedByName ?? `Usuario #${exp.exportedBy}`}
                          </span>
                        </TableCell>

                        {/* Fecha */}
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDateTime(exp.exportedAt)}
                        </TableCell>

                        {/* Hash SHA-256 */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              {truncateHash(exp.fileHash)}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyHash(exp.id, exp.fileHash)}
                                >
                                  {copiedId === exp.id ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar hash completo</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>

                        {/* Estado de almacenamiento */}
                        <TableCell className="text-center">
                          {exp.fileKey ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Disponible
                            </Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge
                                  variant="outline"
                                  className="text-amber-600 border-amber-300 gap-1"
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  Sin archivo
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                El archivo no fue guardado en el almacenamiento. Genere una nueva
                                exportación.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                disabled={!exp.fileKey || redownloadMutation.isPending}
                                onClick={() =>
                                  redownloadMutation.mutate({ id: exp.id })
                                }
                              >
                                {redownloadMutation.isPending &&
                                redownloadMutation.variables?.id === exp.id ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                                Descargar
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {exp.fileKey
                                ? "Descargar el archivo XML original"
                                : "Archivo no disponible para re-descarga"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}
          </CardContent>

          {/* Paginación */}
          {data && data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, data.total)} de {data.total} exportaciones
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Nota informativa */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-medium">Verificación de integridad</p>
            <p>
              El hash SHA-256 de cada exportación permite verificar que el archivo no fue
              modificado después de su generación. Para verificar, calcule el SHA-256 del archivo
              descargado y compárelo con el hash registrado en esta tabla.
            </p>
          </div>
        </div>
      </div>

      {/* Diálogo de error al re-descargar */}
      <AlertDialog open={!!errorDialog} onOpenChange={() => setErrorDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Archivo no disponible
            </AlertDialogTitle>
            <AlertDialogDescription>{errorDialog}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
