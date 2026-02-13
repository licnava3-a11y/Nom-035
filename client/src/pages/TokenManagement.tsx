import { useState } from "react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, Download, Copy, Send, Users, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import QRCode from "qrcode";
import ProtectedButton from "@/components/ProtectedButton";

export default function TokenManagement() {
  const [activeTab, setActiveTab] = useState("generate");
  
  // Form state - Single token
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  
  // Form state - Bulk tokens
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [bulkPeriodId, setBulkPeriodId] = useState("");
  const [bulkSurveyId, setBulkSurveyId] = useState("");
  const [bulkExpiresInDays, setBulkExpiresInDays] = useState("30");
  
  // Filter state
  const [filterPeriodId, setFilterPeriodId] = useState<number | undefined>(undefined);
  
  // Generated token state
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Queries
  const { data: users } = trpc.users.list.useQuery() as any;
  const { data: periods } = trpc.surveyPeriods.list.useQuery();
  const { data: surveys } = trpc.surveysAdmin.getStats.useQuery({ surveyType: "all" });
  const { data: activeTokens, refetch: refetchTokens } = trpc.surveyTokensAdvanced.getActiveTokens.useQuery({
    periodId: filterPeriodId,
  });
  const { data: tokenStats } = trpc.surveyTokensAdvanced.getTokenStats.useQuery({ periodId: filterPeriodId || 0 });

  // Mutations
  const generateToken = trpc.surveyTokensAdvanced.generateToken.useMutation({
    onSuccess: async (data) => {
      toast.success("Token generado exitosamente");
      setGeneratedToken(data.token);
      
      // Generate QR code
      const tokenUrl = `${window.location.origin}/survey/token/${data.token}`;
      const qrUrl = await QRCode.toDataURL(tokenUrl);
      setQrCodeUrl(qrUrl);
      
      refetchTokens();
      setActiveTab("list");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const generateBulkTokens = trpc.surveyTokensAdvanced.generateBulkTokens.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} tokens generados exitosamente`);
      refetchTokens();
      setActiveTab("list");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Export functionality removed - exportTokensToExcel returns array, not file URL

  const handleGenerateSingleToken = () => {
    if (!selectedUserId || !selectedPeriodId || !selectedSurveyId) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    generateToken.mutate({
      userId: parseInt(selectedUserId),
      periodId: parseInt(selectedPeriodId),
      surveyId: parseInt(selectedSurveyId),
      expiresInDays: parseInt(expiresInDays),
    });
  };

  const handleGenerateBulkTokens = () => {
    if (selectedUserIds.length === 0 || !bulkPeriodId || !bulkSurveyId) {
      toast.error("Por favor selecciona al menos un usuario y completa todos los campos");
      return;
    }

    generateBulkTokens.mutate({
      userIds: selectedUserIds,
      periodId: parseInt(bulkPeriodId),
      surveyId: parseInt(bulkSurveyId),
      expiresInDays: parseInt(bulkExpiresInDays),
    });
  };

  const handleCopyToken = (token: string) => {
    const tokenUrl = `${window.location.origin}/survey/token/${token}`;
    navigator.clipboard.writeText(tokenUrl);
    toast.success("URL copiada al portapapeles");
  };

  const handleExportToExcel = () => {
    toast.info("Funcionalidad de exportación en desarrollo");
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/surveys">Encuestas NOM-035</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Gestión de Tokens</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Tokens de Acceso</h1>
        <p className="text-gray-600 mt-2">
          Genera tokens únicos para acceso anónimo a encuestas NOM-035
        </p>
      </div>

      {/* Statistics Cards */}
      {tokenStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Tokens Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tokenStats.active}</div>
              <p className="text-xs text-gray-500 mt-1">No usados y vigentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Tokens Usados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{tokenStats.used}</div>
              <p className="text-xs text-gray-500 mt-1">Encuestas completadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Tokens Expirados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{tokenStats.expired}</div>
              <p className="text-xs text-gray-500 mt-1">Vencidos sin usar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Generados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tokenStats.total}</div>
              <p className="text-xs text-gray-500 mt-1">Todos los tokens</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generar Token Único</TabsTrigger>
          <TabsTrigger value="bulk">Generación Masiva</TabsTrigger>
          <TabsTrigger value="list">Tokens Activos</TabsTrigger>
        </TabsList>

        {/* Generate Single Token */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generar Token Único</CardTitle>
              <CardDescription>
                Crea un token de acceso para un usuario específico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Usuario</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger id="user">
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Periodo de Aplicación</Label>
                  <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                    <SelectTrigger id="period">
                      <SelectValue placeholder="Selecciona un periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods?.map((period: any) => (
                        <SelectItem key={period.id} value={String(period.id)}>
                          {period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="survey">Encuesta</Label>
                  <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
                    <SelectTrigger id="survey">
                      <SelectValue placeholder="Selecciona una encuesta" />
                    </SelectTrigger>
                    <SelectContent>
                      {surveys?.map((survey: any) => (
                        <SelectItem key={survey.id} value={String(survey.id)}>
                          {survey.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires">Días de Vigencia</Label>
                  <Input
                    id="expires"
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    min="1"
                    max="365"
                  />
                </div>
              </div>

              <ProtectedButton
                onClick={handleGenerateSingleToken}
                requiredPermission="can_create"
                className="w-full"
                disabled={generateToken.isPending}
              >
                <QrCode className="w-4 h-4 mr-2" />
                {generateToken.isPending ? "Generando..." : "Generar Token"}
              </ProtectedButton>

              {generatedToken && qrCodeUrl && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div>
                    <Label>Token Generado</Label>
                    <div className="flex gap-2 mt-2">
                      <Input value={generatedToken} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyToken(generatedToken)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-center">
                    <Label>Código QR</Label>
                    <div className="mt-2 inline-block p-4 bg-white rounded-lg">
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Bulk Tokens */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Generación Masiva de Tokens</CardTitle>
              <CardDescription>
                Genera tokens para múltiples usuarios simultáneamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-period">Periodo de Aplicación</Label>
                  <Select value={bulkPeriodId} onValueChange={setBulkPeriodId}>
                    <SelectTrigger id="bulk-period">
                      <SelectValue placeholder="Selecciona un periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods?.map((period: any) => (
                        <SelectItem key={period.id} value={String(period.id)}>
                          {period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-survey">Encuesta</Label>
                  <Select value={bulkSurveyId} onValueChange={setBulkSurveyId}>
                    <SelectTrigger id="bulk-survey">
                      <SelectValue placeholder="Selecciona una encuesta" />
                    </SelectTrigger>
                    <SelectContent>
                      {surveys?.map((survey: any) => (
                        <SelectItem key={survey.id} value={String(survey.id)}>
                          {survey.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-expires">Días de Vigencia</Label>
                  <Input
                    id="bulk-expires"
                    type="number"
                    value={bulkExpiresInDays}
                    onChange={(e) => setBulkExpiresInDays(e.target.value)}
                    min="1"
                    max="365"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Seleccionar Usuarios ({selectedUserIds.length} seleccionados)</Label>
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {users?.map((user: any) => (
                      <label key={user.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, user.id]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{user.name} ({user.email})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <ProtectedButton
                onClick={handleGenerateBulkTokens}
                requiredPermission="can_create"
                className="w-full"
                disabled={generateBulkTokens.isPending}
              >
                <Users className="w-4 h-4 mr-2" />
                {generateBulkTokens.isPending ? "Generando..." : `Generar ${selectedUserIds.length} Tokens`}
              </ProtectedButton>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Tokens List */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Tokens Activos</CardTitle>
                  <CardDescription>
                    Lista de tokens vigentes y no utilizados
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={filterPeriodId ? String(filterPeriodId) : ""} onValueChange={(value) => setFilterPeriodId(value ? parseInt(value) : undefined)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los periodos</SelectItem>
                      {periods?.map((period: any) => (
                        <SelectItem key={period.id} value={String(period.id)}>
                          {period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ProtectedButton
                    onClick={handleExportToExcel}
                    requiredPermission="can_export"
                    variant="outline"
                    disabled={!filterPeriodId}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar a Excel
                  </ProtectedButton>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTokens?.map((token: any) => (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{token.userName}</div>
                          <div className="text-sm text-gray-500">{token.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{token.periodName}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {token.token.substring(0, 16)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(token.expiresAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Activo
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToken(token.token)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {activeTokens?.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay tokens activos para mostrar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
