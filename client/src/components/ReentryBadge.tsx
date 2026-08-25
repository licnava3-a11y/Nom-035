import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RotateCcw } from "lucide-react";

interface ReentryBadgeProps {
  reentryCount: number;
  previousHireDates?: string[] | null;
}

export function ReentryBadge({
  reentryCount,
  previousHireDates,
}: ReentryBadgeProps) {
  if (reentryCount === 0 || !reentryCount) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-help gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reingreso #{reentryCount}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Historial de Contrataciones</p>
            {previousHireDates && previousHireDates.length > 0 ? (
              <ul className="text-xs space-y-1">
                {previousHireDates.map((date, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Contratación {index + 1}:
                    </span>
                    <span className="font-medium">{formatDate(date)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                No hay fechas previas registradas
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
