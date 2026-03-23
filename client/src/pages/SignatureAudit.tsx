import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileDown, Search, Eye, CheckCircle2, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SignatureAudit() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userId, setUserId] = useState<number | undefined>();
  const [operatingRuleId, setOperatingRuleId] = useState<number | undefined>();
  const [role, setRole] = useState<"president" | "secretary" | "vocal" | "other" | undefined>();
  const [status, setStatus] = useState<"pending" | "signed" | "rejected" | undefined>();
  const [page, setPage] = useState(0);
  const [selectedSignature, setSelectedSignature] = useState<any | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const limit = 50;

  // Query
  const { data: auditData, isLoading, refetch } = trpc.committeeOperatingRules.getSignatureAuditLog.useQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    userId,
    operatingRuleId,
    role,
    status,
    limit,
    offset: page * limit,
  });

  const { data: users } = trpc.users.list.useQuery();
  const { data: operatingRules } = trpc.committeeOperatingRules.list.useQuery();

  const handleSearch = () => {
    setPage(0);
    refetch();
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setUserId(undefined);
    setOperatingRuleId(undefined);
    setRole(undefined);
    setStatus(undefined);
    setPage(0);
    refetch();
  };

  const handleExportToExcel = () => {
    if (!auditData || auditData.data.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    // Crear CSV
    const headers = [
      "Fecha",
      "Usuario",
      "Email",
      "Documento",
      "Rol",
      "Estado",
      "Fecha de Firma",
      "Comentarios",
      "Motivo de Rechazo",
    ];

    const rows = auditData.data.map((item: any) => [
      format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
      item.approverName || "N/A",
      item.approverEmail || "N/A",
      item.operatingRuleVersion || "N/A",
      getRoleLabel(item.approverRole),
      getStatusLabel(item.status),
      item.signedAt ? format(new Date(item.signedAt), "dd/MM/yyyy HH:mm", { locale: es }) : "N/A",
      item.comments || "N/A",
      item.rejectionReason || "N/A",
    ]);

    const csvContent = [headers, ...rows].map((row: any) => row.map((cell: any) => `"${cell}"`).join(",")).join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_firmas_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();

    toast.success("Archivo CSV exportado correctamente");
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      president: "Presidente",
      secretary: "Secretario",
      vocal: "Vocal",
      other: "Otro",
    };
    return labels[role] || role;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendiente",
      signed: "Firmado",
      rejected: "Rechazado",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Firmado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = auditData ? Math.ceil(auditData.total / limit) : 0;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Auditoría de Firmas Digitales</CardTitle>
          <CardDescription>
            Historial completo de todas las firmas realizadas en el sistema de bases de funcionamiento del comité
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted rounded-lg">
            <div>
              <Label>Fecha Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div>
              <Label>Fecha Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div>
              <Label>Usuario</Label>
              <Select modal={false} value={userId?.toString() || "all"} onValueChange={(value) => setUserId(value === "all" ? undefined : Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Documento</Label>
              <Select modal={false}
                value={operatingRuleId?.toString() || "all"}
                onValueChange={(value) => setOperatingRuleId(value === "all" ? undefined : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los documentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los documentos</SelectItem>
                  {operatingRules?.map((rule: any) => (
                    <SelectItem key={rule.id} value={rule.id.toString()}>
                      {rule.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rol</Label>
              <Select modal={false} value={role || "all"} onValueChange={(value) => setRole(value === "all" ? undefined : value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="president">Presidente</SelectItem>
                  <SelectItem value="secretary">Secretario</SelectItem>
                  <SelectItem value="vocal">Vocal</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado</Label>
              <Select modal={false} value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? undefined : value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="signed">Firmado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full flex gap-2 justify-end">
              <Button variant="outline" onClick={handleReset}>
                Limpiar Filtros
              </Button>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button variant="secondary" onClick={handleExportToExcel} disabled={!auditData || auditData.data.length === 0}>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Tabla de Resultados */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : !auditData || auditData.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron registros con los filtros aplicados
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha de Acción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData.data.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.approverName}</div>
                            <div className="text-xs text-muted-foreground">{item.approverEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.operatingRuleVersion}</TableCell>
                        <TableCell>
                          {getRoleLabel(item.approverRole)}
                          {item.approverRoleDescription && (
                            <div className="text-xs text-muted-foreground">{item.approverRoleDescription}</div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.signedAt
                            ? format(new Date(item.signedAt), "dd/MM/yyyy HH:mm", { locale: es })
                            : item.rejectedAt
                            ? format(new Date(item.rejectedAt), "dd/MM/yyyy HH:mm", { locale: es })
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedSignature(item);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, auditData.total)} de {auditData.total} registros
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Detalle de Firma */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Firma Digital</DialogTitle>
            <DialogDescription>Información completa del registro de firma</DialogDescription>
          </DialogHeader>

          {selectedSignature && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Usuario</Label>
                  <div className="font-medium">{selectedSignature.approverName}</div>
                  <div className="text-sm text-muted-foreground">{selectedSignature.approverEmail}</div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Documento</Label>
                  <div className="font-medium">{selectedSignature.operatingRuleVersion}</div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Rol</Label>
                  <div className="font-medium">{getRoleLabel(selectedSignature.approverRole)}</div>
                  {selectedSignature.approverRoleDescription && (
                    <div className="text-sm text-muted-foreground">{selectedSignature.approverRoleDescription}</div>
                  )}
                </div>

                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">{getStatusBadge(selectedSignature.status)}</div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Fecha de Solicitud</Label>
                  <div className="font-medium">
                    {format(new Date(selectedSignature.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Fecha de Acción</Label>
                  <div className="font-medium">
                    {selectedSignature.signedAt
                      ? format(new Date(selectedSignature.signedAt), "dd/MM/yyyy HH:mm", { locale: es })
                      : selectedSignature.rejectedAt
                      ? format(new Date(selectedSignature.rejectedAt), "dd/MM/yyyy HH:mm", { locale: es })
                      : "N/A"}
                  </div>
                </div>
              </div>

              {selectedSignature.comments && (
                <div>
                  <Label className="text-muted-foreground">Comentarios</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">{selectedSignature.comments}</div>
                </div>
              )}

              {selectedSignature.rejectionReason && (
                <div>
                  <Label className="text-muted-foreground">Motivo de Rechazo</Label>
                  <div className="mt-1 p-3 bg-destructive/10 text-destructive rounded-md">
                    {selectedSignature.rejectionReason}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
