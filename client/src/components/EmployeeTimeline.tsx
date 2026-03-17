import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Briefcase, LogOut, RotateCcw, FileText } from "lucide-react";

interface EmployeeHistoryEvent {
  id: number;
  eventType: 'hire' | 'reentry' | 'termination';
  eventDate: string;
  notes?: string | null;
  terminationReason?: string | null;
}

interface EmployeeTimelineProps {
  history: EmployeeHistoryEvent[];
  employeeName: string;
}

export function EmployeeTimeline({ history, employeeName }: EmployeeTimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'hire':
        return <Briefcase className="h-5 w-5 text-green-600" />;
      case 'reentry':
        return <RotateCcw className="h-5 w-5 text-blue-600" />;
      case 'termination':
        return <LogOut className="h-5 w-5 text-red-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'hire':
        return 'Contratación Inicial';
      case 'reentry':
        return 'Reingreso';
      case 'termination':
        return 'Terminación';
      default:
        return 'Evento';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'hire':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'reentry':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'termination':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial Laboral
          </CardTitle>
          <CardDescription>
            Línea de tiempo de {employeeName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay eventos registrados en el historial
          </p>
        </CardContent>
      </Card>
    );
  }

  // Ordenar eventos por fecha descendente (más reciente primero)
  const sortedHistory = [...history].sort((a: any, b: any) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Historial Laboral
        </CardTitle>
        <CardDescription>
          Línea de tiempo de {employeeName} ({sortedHistory.length} {sortedHistory.length === 1 ? 'evento' : 'eventos'})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {/* Línea vertical del timeline */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

          {sortedHistory.map((event, index) => (
            <div key={event.id} className="relative flex gap-4">
              {/* Icono del evento */}
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm">
                {getEventIcon(event.eventType)}
              </div>

              {/* Contenido del evento */}
              <div className="flex-1 space-y-2 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={getEventColor(event.eventType)}>
                    {getEventLabel(event.eventType)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(event.eventDate)}
                  </span>
                </div>

                {event.terminationReason && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium">Motivo: </span>
                      <span className="text-muted-foreground">{event.terminationReason}</span>
                    </div>
                  </div>
                )}

                {event.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium">Notas: </span>
                      <span className="text-muted-foreground">{event.notes}</span>
                    </div>
                  </div>
                )}

                {index < sortedHistory.length - 1 && (
                  <div className="pt-2 border-b" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
