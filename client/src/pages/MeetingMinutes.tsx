import { useState } from "react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Calendar, Users, CheckCircle, Clock, Edit } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MeetingMinutes() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: minutes, isLoading } = trpc.meetingMinutes.list.useQuery({
    status: statusFilter === "all" ? undefined : (statusFilter as "draft" | "finalized" | "signed"),
    meetingType: typeFilter === "all" ? undefined : typeFilter,
    search: searchQuery || undefined,
  });

  const { data: meetingTypes } = trpc.meetingMinutes.getMeetingTypes.useQuery();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Borrador", variant: "secondary" as const, icon: Edit },
      finalized: { label: "Finalizada", variant: "default" as const, icon: CheckCircle },
      signed: { label: "Firmada", variant: "default" as const, icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-8">
      <Breadcrumb items={[
        { label: "Prevención de Riesgos", href: "/prevention" },
        { label: "Minutas de Reunión" }
      ]} />

        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Minutas de Reunión</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de minutas con foliado automático y firma digital (NOM-151)
          </p>
        </div>
        <Button onClick={() => setLocation("/meeting-minutes/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Minuta
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Buscar</label>
            <Input
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="finalized">Finalizada</option>
              <option value="signed">Firmada</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Reunión</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">Todos los tipos</option>
              {meetingTypes?.map((type: any) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Lista de Minutas */}
      {!minutes || minutes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay minutas registradas</h3>
          <p className="text-muted-foreground mb-4">
            Comienza creando tu primera minuta de reunión
          </p>
          <Button onClick={() => setLocation("/meeting-minutes/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Minuta
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {minutes.map((minute: any) => (
            <Card
              key={minute.id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(`/meeting-minutes/${minute.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{minute.title}</h3>
                    {getStatusBadge(minute.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span className="font-mono">{minute.folio}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(minute.meetingDate), "d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                    </div>
                    <Badge variant="outline">{minute.meetingType}</Badge>
                  </div>
                  {minute.location && (
                    <p className="text-sm text-muted-foreground">
                      📍 {minute.location}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm">
                  Ver Detalle
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Minutas</p>
              <p className="text-2xl font-bold">{minutes?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Borradores</p>
              <p className="text-2xl font-bold">
                {minutes?.filter((m: any) => m.status === "draft").length || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Firmadas</p>
              <p className="text-2xl font-bold">
                {minutes?.filter((m: any) => m.status === "signed").length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
