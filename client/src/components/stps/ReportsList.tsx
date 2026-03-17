import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ReportsList() {
  const [reportType, setReportType] = useState<"dc2" | "dc3" | "dc4" | undefined>(undefined);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Query para listar reportes
  const { data, isLoading, refetch } = trpc.stpsReports.listReports.useQuery({
    reportType,
    limit,
    offset: page * limit,
  });

  const reports = data?.reports || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;
  const totalPages = Math.ceil(total / limit);

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case "dc2":
        return <Badge variant="default">DC-2</Badge>;
      case "dc3":
        return <Badge variant="secondary">DC-3</Badge>;
      case "dc4":
        return <Badge variant="outline">DC-4</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Reporte</Label>
            <Select
              value={reportType || "all"}
              onValueChange={(value) => {
                setReportType(value === "all" ? undefined : (value as "dc2" | "dc3" | "dc4"));
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="dc2">DC-2: Constancia de Competencias</SelectItem>
                <SelectItem value="dc3">DC-3: Constancia de Habilidades</SelectItem>
                <SelectItem value="dc4">DC-4: Lista de Constancias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2 flex items-end">
            <Button onClick={() => refetch()} variant="outline" className="w-full md:w-auto">
              Actualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabla de reportes */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">No se encontraron reportes</p>
            <p className="text-sm">
              {reportType
                ? `No hay reportes de tipo ${reportType.toUpperCase()} generados`
                : "Aún no se han generado reportes STPS"}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Folio</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Fecha de Generación</TableHead>
                  <TableHead>Generado Por</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell>{getReportTypeBadge(report.tipo)}</TableCell>
                    <TableCell className="font-mono text-sm">{report.folio || "N/A"}</TableCell>
                    <TableCell className="max-w-xs truncate">{report.titulo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(report.generatedAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <p className="font-medium">{report.generatedByName}</p>
                        {report.generatedByEmail && (
                          <p className="text-xs text-muted-foreground">{report.generatedByEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {report.data && typeof report.data === 'object' && 'pdfUrl' in report.data ? (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={(report.data as any).pdfUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </a>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" disabled>
                          No disponible
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, total)} de {total} reportes
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!hasMore}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
