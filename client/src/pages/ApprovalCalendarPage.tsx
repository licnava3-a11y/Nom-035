import { ApprovalCalendar } from "@/components/ApprovalCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";

export default function ApprovalCalendarPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Calendario de Aprobaciones
          </CardTitle>
          <CardDescription>
            Visualiza y gestiona las fechas límite de aprobación de las bases de funcionamiento del comité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApprovalCalendar />
        </CardContent>
      </Card>
    </div>
  );
}
