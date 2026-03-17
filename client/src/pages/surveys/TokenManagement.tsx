import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, QrCode, Plus, Trash2, Copy, Check } from "lucide-react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";

type SurveyType = "guia_i" | "guia_ii" | "guia_iii";

export default function TokenManagement() {
  const [surveyType, setSurveyType] = useState<SurveyType>("guia_i");
  const [quantity, setQuantity] = useState(1);
  const [expirationDays, setExpirationDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [qrModalToken, setQrModalToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Queries
  const { data: tokensData, refetch: refetchTokens } = trpc.surveyAnonymousTokens.getAll.useQuery({
    page: 1,
    pageSize: 50,
  });

  const { data: statsData } = trpc.surveyAnonymousTokens.getStats.useQuery();

  // Mutations
  const generateBulkMutation = trpc.surveyAnonymousTokens.generateBatch.useMutation({
    onSuccess: () => {
      alert(`✅ ${quantity} tokens generados exitosamente`);
      refetchTokens();
      setQuantity(1);
      setNotes("");
    },
    onError: (error) => {
      alert(`❌ Error al generar tokens: ${error.message}`);
    },
  });

  const revokeMutation = trpc.surveyAnonymousTokens.revokeToken.useMutation({
    onSuccess: () => {
      alert("✅ Token revocado exitosamente");
      refetchTokens();
    },
    onError: (error) => {
      alert(`❌ Error al revocar token: ${error.message}`);
    },
  });

  const handleGenerateTokens = () => {
    if (quantity < 1 || quantity > 1000) {
      alert("La cantidad debe estar entre 1 y 1000");
      return;
    }

    generateBulkMutation.mutate({
      surveyType,
      count: quantity,
      expiresInDays: expirationDays,
      notes: notes || undefined,
    });
  };

  const handleCopyToken = (token: string) => {
    const url = `${window.location.origin}/survey/anonymous/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleGenerateQR = async (token: string) => {
    try {
      const url = `${window.location.origin}/survey/anonymous/${token}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
      });
      setQrDataUrl(qrDataUrl);
      setQrModalToken(token);
    } catch (error) {
      alert("Error al generar código QR");
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-token-${qrModalToken}.png`;
    link.click();
  };

  const handleExportToExcel = () => {
    if (!tokensData?.tokens || tokensData.tokens.length === 0) {
      alert("No hay tokens para exportar");
      return;
    }

    const exportData = tokensData.tokens.map((token: any) => ({
      Token: token.token,
      "Tipo de Encuesta": token.surveyType === "guia_i" ? "Guía I" : token.surveyType === "guia_ii" ? "Guía II" : "Guía III",
      "URL de Acceso": `${window.location.origin}/survey/anonymous/${token.token}`,
      Estado: token.isRevoked ? "Revocado" : token.usedAt ? "Usado" : token.expiresAt && new Date(token.expiresAt) < new Date() ? "Expirado" : "Activo",
      "Fecha de Creación": new Date(token.createdAt).toLocaleDateString("es-MX"),
      "Fecha de Expiración": token.expiresAt ? new Date(token.expiresAt).toLocaleDateString("es-MX") : "Sin expiración",
      "Usado el": token.usedAt ? new Date(token.usedAt).toLocaleDateString("es-MX") : "No usado",
      Notas: token.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tokens");

    // Ajustar ancho de columnas
    const maxWidth = 30;
    worksheet["!cols"] = [
      { wch: 40 }, // Token
      { wch: 20 }, // Tipo de Encuesta
      { wch: 60 }, // URL de Acceso
      { wch: 15 }, // Estado
      { wch: 20 }, // Fecha de Creación
      { wch: 20 }, // Fecha de Expiración
      { wch: 20 }, // Usado el
      { wch: maxWidth }, // Notas
    ];

    XLSX.writeFile(workbook, `tokens-anonimos-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleRevokeToken = (tokenId: number) => {
    if (confirm("¿Estás seguro de que deseas revocar este token? Esta acción no se puede deshacer.")) {
      revokeMutation.mutate({ tokenId });
    }
  };

  const getSurveyTypeLabel = (type: string) => {
    switch (type) {
      case "guia_i":
        return "Guía I";
      case "guia_ii":
        return "Guía II";
      case "guia_iii":
        return "Guía III";
      default:
        return type;
    }
  };

  const getTokenStatus = (token: any) => {
    if (token.isRevoked) return { label: "Revocado", variant: "destructive" as const };
    if (token.usedAt) return { label: "Usado", variant: "secondary" as const };
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) return { label: "Expirado", variant: "outline" as const };
    return { label: "Activo", variant: "default" as const };
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Tokens de Acceso Anónimo</h1>
        <p className="text-muted-foreground mt-2">
          Genera y administra tokens para que los empleados respondan encuestas sin necesidad de iniciar sesión
        </p>
      </div>

      {/* Estadísticas */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statsData.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Usados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statsData.used}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expirados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{statsData.expired}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revocados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statsData.revoked}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulario de Generación */}
      <Card>
        <CardHeader>
          <CardTitle>Generar Tokens</CardTitle>
          <CardDescription>Crea tokens de acceso anónimo para encuestas NOM-035</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="surveyType">Tipo de Encuesta</Label>
              <Select value={surveyType} onValueChange={(value) => setSurveyType(value as SurveyType)}>
                <SelectTrigger id="surveyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guia_i">Guía I - Factores de Riesgo</SelectItem>
                  <SelectItem value="guia_ii">Guía II - Identificación de Trabajadores</SelectItem>
                  <SelectItem value="guia_iii">Guía III - Evaluación del Entorno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad de Tokens</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={1000}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                placeholder="1-1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expirationDays">Días de Validez</Label>
              <Input
                id="expirationDays"
                type="number"
                min={1}
                max={365}
                value={expirationDays}
                onChange={(e) => setExpirationDays(parseInt(e.target.value) || 30)}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Tokens para Depto. RH"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerateTokens} disabled={generateBulkMutation.isPending} className="gap-2">
              <Plus className="w-4 h-4" />
              {generateBulkMutation.isPending ? "Generando..." : "Generar Tokens"}
            </Button>
            <Button variant="outline" onClick={handleExportToExcel} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar a Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Tokens */}
      <Card>
        <CardHeader>
          <CardTitle>Tokens Generados</CardTitle>
          <CardDescription>Lista de todos los tokens de acceso anónimo</CardDescription>
        </CardHeader>
        <CardContent>
          {tokensData && tokensData.tokens.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Encuesta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Usado</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokensData.tokens.map((token: any) => {
                    const status = getTokenStatus(token);
                    return (
                      <TableRow key={token.id}>
                        <TableCell className="font-mono text-xs">{token.token.substring(0, 12)}...</TableCell>
                        <TableCell>{getSurveyTypeLabel(token.surveyType)}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>{new Date(token.createdAt).toLocaleDateString("es-MX")}</TableCell>
                        <TableCell>
                          {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString("es-MX") : "Sin expiración"}
                        </TableCell>
                        <TableCell>
                          {token.usedAt ? new Date(token.usedAt).toLocaleDateString("es-MX") : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{token.notes || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyToken(token.token)}
                              className="h-8 w-8 p-0"
                              title="Copiar URL"
                            >
                              {copiedToken === token.token ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGenerateQR(token.token)}
                              className="h-8 w-8 p-0"
                              title="Generar QR"
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                            {!token.isRevoked && !token.usedAt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeToken(token.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                title="Revocar token"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay tokens generados. Genera tu primer token usando el formulario de arriba.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de QR Code */}
      {qrModalToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQrModalToken(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Código QR del Token</h3>
            <div className="flex justify-center mb-4">
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Escanea este código QR para acceder directamente a la encuesta
            </p>
            <div className="flex gap-2">
              <Button onClick={handleDownloadQR} className="flex-1 gap-2">
                <Download className="w-4 h-4" />
                Descargar QR
              </Button>
              <Button variant="outline" onClick={() => setQrModalToken(null)} className="flex-1">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
