/**
 * Anonymous Tokens Management Page
 * Admin interface for generating and managing anonymous survey tokens
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, RefreshCw, Ban, QrCode } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AnonymousTokens() {
  const utils = trpc.useUtils();

  // Generation form state
  const [surveyType, setSurveyType] = useState<"guia_i" | "guia_ii" | "guia_iii">("guia_i");
  const [count, setCount] = useState("10");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");

  // Filters state
  const [page, setPage] = useState(1);
  const [filterSurveyType, setFilterSurveyType] = useState<"all" | "guia_i" | "guia_ii" | "guia_iii">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "used" | "expired" | "revoked">("active");
  const [filterDepartment, setFilterDepartment] = useState("");

  // QR Code dialog
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  // Queries
  const statsQuery = trpc.surveyAnonymousTokens.getStats.useQuery();
  const tokensQuery = trpc.surveyAnonymousTokens.getAll.useQuery({
    page,
    pageSize: 50,
    surveyType: filterSurveyType,
    status: filterStatus,
    department: filterDepartment || undefined,
  });

  // Mutations
  const generateMutation = trpc.surveyAnonymousTokens.generateBatch.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Tokens generados exitosamente");
      utils.surveyAnonymousTokens.getAll.invalidate();
      utils.surveyAnonymousTokens.getStats.invalidate();
      // Reset form
      setCount("10");
      setDepartment("");
      setNotes("");
    },
    onError: (error) => {
      toast.error(`Error al generar tokens: ${error.message}`);
    },
  });

  const revokeMutation = trpc.surveyAnonymousTokens.revokeToken.useMutation({
    onSuccess: () => {
      toast.success("Token revocado exitosamente");
      utils.surveyAnonymousTokens.getAll.invalidate();
      utils.surveyAnonymousTokens.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Error al revocar token: ${error.message}`);
    },
  });

  const exportQuery = trpc.surveyAnonymousTokens.exportTokens.useQuery(
    {
      surveyType: filterSurveyType,
      status: filterStatus,
    },
    { enabled: false }
  );

  const handleGenerate = () => {
    const countNum = parseInt(count);
    const expiresNum = parseInt(expiresInDays);

    if (isNaN(countNum) || countNum < 1 || countNum > 1000) {
      toast.error("La cantidad debe estar entre 1 y 1000");
      return;
    }

    if (isNaN(expiresNum) || expiresNum < 1 || expiresNum > 365) {
      toast.error("Los días de expiración deben estar entre 1 y 365");
      return;
    }

    generateMutation.mutate({
      surveyType,
      count: countNum,
      expiresInDays: expiresNum,
      department: department || undefined,
      notes: notes || undefined,
    });
  };

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;

    // Convert to CSV
    const headers = ["Token", "Tipo de Encuesta", "Departamento", "Expira", "Usado", "Revocado", "Creado"];
    const rows = result.data.map((token) => [
      token.token,
      token.surveyType,
      token.department || "",
      new Date(token.expiresAt).toLocaleDateString("es-MX"),
      token.usedAt ? new Date(token.usedAt).toLocaleDateString("es-MX") : "",
      token.isRevoked ? "Sí" : "No",
      new Date(token.createdAt).toLocaleDateString("es-MX"),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tokens-anonimos-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Los tokens han sido exportados a CSV");
  };

  const getSurveyTypeName = (type: string) => {
    const names: Record<string, string> = {
      guia_i: "Guía I (Cuestionario de Identificación)",
      guia_ii: "Guía II (Cuestionario de Factores de Riesgo)",
      guia_iii: "Guía III (Cuestionario de Entorno Organizacional)",
    };
    return names[type] || type;
  };

  const getStatusBadge = (token: any) => {
    if (token.isRevoked) {
      return <Badge variant="destructive">Revocado</Badge>;
    }
    if (token.usedAt) {
      return <Badge variant="secondary">Usado</Badge>;
    }
    if (new Date() > new Date(token.expiresAt)) {
      return <Badge variant="outline">Expirado</Badge>;
    }
    return <Badge className="bg-green-600 hover:bg-green-700">Activo</Badge>;
  };

  const generateQRCodeUrl = (token: string) => {
    const baseUrl = window.location.origin;
    const surveyUrl = `${baseUrl}/survey/anonymous/${token}`;
    // Using a free QR code API
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(surveyUrl)}`;
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tokens Anónimos de Encuestas</h1>
        <p className="text-muted-foreground mt-2">
          Genera y gestiona tokens de acceso anónimo para las encuestas NOM-035
        </p>
      </div>

      {/* Statistics Cards */}
      {statsQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsQuery.data.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tokens Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statsQuery.data.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tokens Usados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statsQuery.data.used}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tokens Expirados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{statsQuery.data.expired}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tasa de Uso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsQuery.data.usageRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Generar Nuevos Tokens</CardTitle>
          <CardDescription>
            Crea un lote de tokens anónimos para distribuir a los participantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="surveyType">Tipo de Encuesta</Label>
              <Select value={surveyType} onValueChange={(v: any) => setSurveyType(v)}>
                <SelectTrigger id="surveyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guia_i">Guía I</SelectItem>
                  <SelectItem value="guia_ii">Guía II</SelectItem>
                  <SelectItem value="guia_iii">Guía III</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count">Cantidad de Tokens</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="1000"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Días hasta Expiración</Label>
              <Input
                id="expiresInDays"
                type="number"
                min="1"
                max="365"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento (Opcional)</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ej: Recursos Humanos"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas sobre este lote de tokens..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full md:w-auto"
          >
            {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar Tokens
          </Button>
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Lista de Tokens</CardTitle>
              <CardDescription>
                Gestiona y visualiza todos los tokens generados
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  utils.surveyAnonymousTokens.getAll.invalidate();
                  utils.surveyAnonymousTokens.getStats.invalidate();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filterSurveyType">Tipo de Encuesta</Label>
              <Select value={filterSurveyType} onValueChange={(v: any) => {
                setFilterSurveyType(v);
                setPage(1);
              }}>
                <SelectTrigger id="filterSurveyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="guia_i">Guía I</SelectItem>
                  <SelectItem value="guia_ii">Guía II</SelectItem>
                  <SelectItem value="guia_iii">Guía III</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterStatus">Estado</Label>
              <Select value={filterStatus} onValueChange={(v: any) => {
                setFilterStatus(v);
                setPage(1);
              }}>
                <SelectTrigger id="filterStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="used">Usados</SelectItem>
                  <SelectItem value="expired">Expirados</SelectItem>
                  <SelectItem value="revoked">Revocados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterDepartment">Departamento</Label>
              <Input
                id="filterDepartment"
                value={filterDepartment}
                onChange={(e) => {
                  setFilterDepartment(e.target.value);
                  setPage(1);
                }}
                placeholder="Filtrar por departamento..."
              />
            </div>
          </div>

          {/* Table */}
          {tokensQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tokensQuery.data && tokensQuery.data.tokens.length > 0 ? (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Usado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokensQuery.data.tokens.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-mono text-xs">
                          {token.token.substring(0, 16)}...
                        </TableCell>
                        <TableCell>{getSurveyTypeName(token.surveyType)}</TableCell>
                        <TableCell>{token.department || "-"}</TableCell>
                        <TableCell>{getStatusBadge(token)}</TableCell>
                        <TableCell>
                          {new Date(token.expiresAt).toLocaleDateString("es-MX")}
                        </TableCell>
                        <TableCell>
                          {token.usedAt
                            ? new Date(token.usedAt).toLocaleDateString("es-MX")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedToken(token.token)}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            {!token.isRevoked && !token.usedAt && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => revokeMutation.mutate({ tokenId: token.id })}
                                disabled={revokeMutation.isPending}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * 50) + 1} - {Math.min(page * 50, tokensQuery.data.total)} de {tokensQuery.data.total} tokens
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= tokensQuery.data.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron tokens con los filtros seleccionados
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedToken} onOpenChange={() => setSelectedToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código QR del Token</DialogTitle>
            <DialogDescription>
              Escanea este código QR para acceder a la encuesta de forma anónima
            </DialogDescription>
          </DialogHeader>
          {selectedToken && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={generateQRCodeUrl(selectedToken)}
                alt="QR Code"
                className="w-64 h-64 border rounded-lg"
              />
              <p className="text-xs font-mono text-center break-all px-4">
                {window.location.origin}/survey/anonymous/{selectedToken}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/survey/anonymous/${selectedToken}`
                  );
                  toast.success("URL copiada al portapapeles");
                }}
              >
                Copiar URL
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
