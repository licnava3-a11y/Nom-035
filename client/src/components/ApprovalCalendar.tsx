import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";
import { CalendarSkeleton } from "@/components/skeletons";
import { EmptyState, InlineEmptyState } from "@/components/EmptyState";
import { EMPTY_STATES } from "@/lib/emptyStates";

interface ApprovalCalendarProps {
  onSelectDocument?: (operatingRuleId: number) => void;
}

export function ApprovalCalendar({ onSelectDocument }: ApprovalCalendarProps) {
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "completed" | "overdue"
  >("all");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Query para calendario del mes
  const { data: calendarData, isLoading } =
    trpc.committeeOperatingRules.getApprovalCalendar.useQuery({
      year,
      month,
      status: statusFilter,
    });

  // Query para deadlines próximos
  const { data: upcomingData } =
    trpc.committeeOperatingRules.getUpcomingDeadlines.useQuery({
      days: 7,
    });

  // Navegación de mes
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generar días del mes
  const getDaysInMonth = () => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Días vacíos al inicio
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const days = getDaysInMonth();
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  // Obtener eventos de un día
  const getEventsForDay = (day: number) => {
    if (!calendarData?.events) return [];
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarData.events[dateKey] || [];
  };

  // Verificar si es hoy
  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() + 1 &&
      year === today.getFullYear()
    );
  };

  const handleEventClick = (operatingRuleId: number) => {
    if (onSelectDocument) {
      onSelectDocument(operatingRuleId);
    } else {
      setLocation(`/committee-operating-rules?id=${operatingRuleId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold capitalize min-w-[200px] text-center">
            {monthName}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Hoy
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value: any) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="overdue">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendario de Deadlines
            </CardTitle>
            <CardDescription>
              {calendarData?.totalEvents || 0} aprobaciones programadas este mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CalendarSkeleton />
            ) : calendarData?.totalEvents === 0 ? (
              <InlineEmptyState
                {...({} as any)}
                icon={EMPTY_STATES.calendar_no_deadlines.icon}
                title={EMPTY_STATES.calendar_no_deadlines.title}
                description={EMPTY_STATES.calendar_no_deadlines.description}
              />
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {/* Encabezados de días */}
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(
                  (day: any) => (
                    <div
                      key={day}
                      className="text-center font-semibold text-sm text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  )
                )}

                {/* Días del mes */}
                {days.map((day, index) => {
                  const events = day ? getEventsForDay(day) : [];
                  const hasEvents = events.length > 0;
                  const hasOverdue = events.some((e: any) => e.isOverdue);
                  const today = isToday(day);

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[80px] p-2 border rounded-md
                        ${!day ? "bg-muted/30" : "bg-background"}
                        ${today ? "border-primary border-2" : "border-border"}
                        ${hasEvents ? "cursor-pointer hover:bg-accent" : ""}
                      `}
                    >
                      {day && (
                        <>
                          <div
                            className={`text-sm font-medium mb-1 ${today ? "text-primary" : ""}`}
                          >
                            {day}
                          </div>
                          {hasEvents && (
                            <div className="space-y-1">
                              {events.slice(0, 2).map((event: any) => (
                                <div
                                  key={event.id}
                                  onClick={() =>
                                    handleEventClick(event.operatingRuleId)
                                  }
                                  className={`
                                    text-xs p-1 rounded truncate
                                    ${event.isOverdue ? "bg-destructive/20 text-destructive" : ""}
                                    ${event.status === "signed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                                    ${event.status === "pending" && !event.isOverdue ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : ""}
                                  `}
                                  title={`${event.approverName} - ${event.ruleVersion}`}
                                >
                                  {event.approverName}
                                </div>
                              ))}
                              {events.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{events.length - 2} más
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel lateral de deadlines próximos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Próximos 7 Días
            </CardTitle>
            <CardDescription>
              {upcomingData?.total || 0} aprobaciones pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingData?.deadlines && upcomingData.deadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingData.deadlines.map((deadline: any) => (
                  <div
                    key={deadline.id}
                    onClick={() => handleEventClick(deadline.operatingRuleId)}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-medium text-sm">
                        {deadline.ruleVersion}
                      </div>
                      <Badge
                        variant={
                          deadline.urgency === "critical"
                            ? "destructive"
                            : deadline.urgency === "high"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {deadline.daysLeft === 0
                          ? "Hoy"
                          : deadline.daysLeft === 1
                            ? "Mañana"
                            : `${deadline.daysLeft}d`}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {deadline.approverName} - {deadline.approverRole}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(deadline.deadline).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <InlineEmptyState
                {...({} as any)}
                icon={CheckCircle2}
                title="Sin deadlines próximos"
                description="No hay aprobaciones pendientes en los próximos 7 días"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leyenda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300"></div>
              <span className="text-sm">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300"></div>
              <span className="text-sm">Completado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive"></div>
              <span className="text-sm">Vencido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-primary"></div>
              <span className="text-sm">Hoy</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
