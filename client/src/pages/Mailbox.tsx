import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Search, Filter, Eye, FileText, MessageSquare, ThumbsUp, GraduationCap } from "lucide-react";
import { Link } from "wouter";

export default function Mailbox() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: mailboxItems, isLoading, refetch } = trpc.mailbox.list.useQuery();
  const updateStatusMutation = trpc.mailbox.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado correctamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al actualizar estado: ${error.message}`);
    },
  });

  const filteredItems = mailboxItems?.filter((item: any) => {
    const matchesSearch =
      searchQuery === "" ||
      item.folio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.senderName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesType = typeFilter === "all" || item.requestType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      received: { variant: "outline", label: "Recibido" },
      assigned: { variant: "secondary", label: "Asignado" },
      in_progress: { variant: "default", label: "En Proceso" },
      completed: { variant: "default", label: "Concluido" },
    };
    const config = variants[status] || variants.received;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactElement> = {
      complaint: <FileText className="h-4 w-4" />,
      suggestion: <MessageSquare className="h-4 w-4" />,
      congratulation: <ThumbsUp className="h-4 w-4" />,
      training_request: <GraduationCap className="h-4 w-4" />,
    };
    return icons[type] || <FileText className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      complaint: "Queja",
      suggestion: "Sugerencia",
      congratulation: "Felicitación",
      training_request: "Solicitud de Capacitación",
    };
    return labels[type] || type;
  };

  const stats = {
    total: mailboxItems?.length || 0,
    received: mailboxItems?.filter((i: any) => i.status === "received").length || 0,
    assigned: mailboxItems?.filter((i: any) => i.status === "assigned").length || 0,
    in_progress: mailboxItems?.filter((i: any) => i.status === "in_progress").length || 0,
    completed: mailboxItems?.filter((i: any) => i.status === "completed").length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buzón Electrónico</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de quejas, sugerencias, felicitaciones y solicitudes de capacitación
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recibidos</CardDescription>
            <CardTitle className="text-3xl">{stats.received}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Asignados</CardDescription>
            <CardTitle className="text-3xl">{stats.assigned}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En Proceso</CardDescription>
            <CardTitle className="text-3xl">{stats.in_progress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Concluidos</CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio, asunto o remitente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="received">Recibido</SelectItem>
                <SelectItem value="assigned">Asignado</SelectItem>
                <SelectItem value="in_progress">En Proceso</SelectItem>
                <SelectItem value="completed">Concluido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="complaint">Queja</SelectItem>
                <SelectItem value="suggestion">Sugerencia</SelectItem>
                <SelectItem value="congratulation">Felicitación</SelectItem>
                <SelectItem value="training_request">Solicitud de Capacitación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de solicitudes */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes del Buzón</CardTitle>
          <CardDescription>
            {filteredItems?.length || 0} solicitudes encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Remitente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems && filteredItems.length > 0 ? (
                filteredItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.folio}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.requestType)}
                        <span className="text-sm">{getTypeLabel(item.requestType)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.subject}</TableCell>
                    <TableCell>
                      {item.isAnonymous ? (
                        <Badge variant="outline">Anónimo</Badge>
                      ) : (
                        item.senderName || "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("es-MX")
                        : "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <Link href={`/mailbox/${item.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalle
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron solicitudes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
