import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertCircle, Users, CheckCircle, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { AssignCommitteeModal } from "@/components/AssignCommitteeModal";

export default function CaseAssignment() {
  const { user } = useAuth();
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: cases, isLoading: casesLoading } = trpc.cases.list.useQuery();
  const { data: committeeMembers } = trpc.committee.list.useQuery();

  const unassignedCases = cases?.filter((c) => c.status === "open" && !c.assignedTo) || [];
  const assignedCases = cases?.filter((c) => c.assignedTo) || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      open: { label: "Abierto", variant: "destructive" },
      investigating: { label: "En Investigación", variant: "default" },
      resolved: { label: "Resuelto", variant: "secondary" },
      closed: { label: "Cerrado", variant: "outline" },
    };
    const config = variants[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAssignCase = (caseId: number) => {
    setSelectedCaseId(caseId);
    setIsModalOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (casesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asignación de Casos</h1>
          <p className="text-muted-foreground mt-2">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asignación de Casos</h1>
        <p className="text-muted-foreground mt-2">
          Asignar casos psicosociales a miembros del comité de atención
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Asignar</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedCases.length}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asignados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedCases.length}</div>
            <p className="text-xs text-muted-foreground">En proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Disponibles</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{committeeMembers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Del comité</p>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Casos Sin Asignar</CardTitle>
          <CardDescription>Casos que requieren asignación a un miembro del comité</CardDescription>
        </CardHeader>
        <CardContent>
          {unassignedCases.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay casos sin asignar
            </div>
          ) : (
            <div className="space-y-4">
              {unassignedCases.map((caso) => (
                <div key={caso.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">Caso #{caso.caseNumber}</h3>
                      {getStatusBadge(caso.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{caso.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(caso.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button onClick={() => handleAssignCase(caso.id)}>
                    Asignar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Casos Asignados</CardTitle>
          <CardDescription>Casos actualmente asignados a miembros del comité</CardDescription>
        </CardHeader>
        <CardContent>
          {assignedCases.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay casos asignados
            </div>
          ) : (
            <div className="space-y-4">
              {assignedCases.map((caso) => {
                const assignedMember = committeeMembers?.find((m) => m.userId === caso.assignedTo);
                return (
                  <div key={caso.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">Caso #{caso.caseNumber}</h3>
                        {getStatusBadge(caso.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{caso.description}</p>
                      {assignedMember && (
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(assignedMember.userName || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{assignedMember.userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {assignedMember.position}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => handleAssignCase(caso.id)}>
                      Reasignar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      {selectedCaseId && (
        <AssignCommitteeModal
          caseId={selectedCaseId}
          caseNumber={cases?.find((c) => c.id === selectedCaseId)?.caseNumber || ""}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </div>
  );
}
