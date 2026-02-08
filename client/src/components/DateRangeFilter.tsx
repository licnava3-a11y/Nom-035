import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type DateRangePreset = 
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

/**
 * Componente reutilizable de filtro de rango de fechas
 * 
 * Características:
 * - Presets predefinidos (hoy, ayer, semana actual/anterior, mes actual/anterior, año actual/anterior)
 * - Selector de rango personalizado con calendario
 * - Formato en español
 * - Integración con date-fns
 */
export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [isOpen, setIsOpen] = useState(false);

  // Calcular rango según preset
  const getDateRangeFromPreset = (preset: DateRangePreset): DateRange | undefined => {
    const now = new Date();

    switch (preset) {
      case "today":
        return {
          from: startOfDay(now),
          to: endOfDay(now),
        };
      
      case "yesterday":
        return {
          from: startOfDay(subDays(now, 1)),
          to: endOfDay(subDays(now, 1)),
        };
      
      case "this_week":
        return {
          from: startOfWeek(now, { weekStartsOn: 1 }), // Lunes
          to: endOfWeek(now, { weekStartsOn: 1 }),
        };
      
      case "last_week":
        const lastWeek = subWeeks(now, 1);
        return {
          from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
          to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        };
      
      case "this_month":
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
        };
      
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      
      case "this_year":
        return {
          from: startOfYear(now),
          to: endOfYear(now),
        };
      
      case "last_year":
        const lastYear = subYears(now, 1);
        return {
          from: startOfYear(lastYear),
          to: endOfYear(lastYear),
        };
      
      case "custom":
        return value;
      
      default:
        return undefined;
    }
  };

  // Manejar cambio de preset
  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    
    if (newPreset !== "custom") {
      const range = getDateRangeFromPreset(newPreset);
      onChange(range);
    }
  };

  // Manejar selección de rango personalizado
  const handleCustomRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onChange({
        from: startOfDay(range.from),
        to: endOfDay(range.to),
      });
    }
  };

  // Formatear rango para mostrar
  const formatDateRange = () => {
    if (!value) return "Seleccionar período";

    if (preset !== "custom") {
      const presetLabels: Record<Exclude<DateRangePreset, "custom">, string> = {
        today: "Hoy",
        yesterday: "Ayer",
        this_week: "Esta semana",
        last_week: "Semana anterior",
        this_month: "Este mes",
        last_month: "Mes anterior",
        this_year: "Este año",
        last_year: "Año anterior",
      };
      return presetLabels[preset as Exclude<DateRangePreset, "custom">];
    }

    return `${format(value.from, "dd MMM yyyy", { locale: es })} - ${format(value.to, "dd MMM yyyy", { locale: es })}`;
  };

  return (
    <div className={cn("flex gap-2 items-center", className)}>
      {/* Selector de preset */}
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Seleccionar período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoy</SelectItem>
          <SelectItem value="yesterday">Ayer</SelectItem>
          <SelectItem value="this_week">Esta semana</SelectItem>
          <SelectItem value="last_week">Semana anterior</SelectItem>
          <SelectItem value="this_month">Este mes</SelectItem>
          <SelectItem value="last_month">Mes anterior</SelectItem>
          <SelectItem value="this_year">Este año</SelectItem>
          <SelectItem value="last_year">Año anterior</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Selector de rango personalizado */}
      {preset === "custom" && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={value ? { from: value.from, to: value.to } : undefined}
              onSelect={handleCustomRangeChange}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Botón para limpiar filtro */}
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(undefined);
            setPreset("this_month");
          }}
        >
          Limpiar
        </Button>
      )}
    </div>
  );
}
