import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PositionSelectProps {
  value: string;
  onChange: (value: string) => void;
  department?: string; // Optional: filter positions by department
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function PositionSelect({
  value,
  onChange,
  department,
  label = "Puesto",
  placeholder = "Selecciona un puesto",
  required = false,
  error,
}: PositionSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Fetch positions from catalog (optionally filtered by department)
  const { data: positions, isLoading } = department
    ? trpc.employees.getPositionsByDepartment.useQuery({ department })
    : trpc.employees.getPositions.useQuery();

  // Filter positions based on search
  const filteredPositions = positions?.filter((pos) =>
    pos?.toLowerCase().includes(searchValue.toLowerCase())
  ).filter(Boolean) || [];

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="position-select">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
              error && "border-destructive"
            )}
            disabled={!department}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Buscar puesto..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Cargando puestos...</CommandEmpty>
              ) : filteredPositions.length === 0 ? (
                <CommandEmpty>
                  {searchValue ? (
                    <>
                      No se encontró "{searchValue}".{" "}
                      <button
                        className="text-primary underline"
                        onClick={() => {
                          onChange(searchValue);
                          setOpen(false);
                        }}
                      >
                        Crear nuevo
                      </button>
                    </>
                  ) : department ? (
                    `No hay puestos disponibles para ${department}`
                  ) : (
                    "No hay puestos disponibles"
                  )}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredPositions.map((pos) => pos && (
                    <CommandItem
                      key={pos}
                      value={pos}
                      onSelect={(currentValue) => {
                        onChange(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === pos ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {pos}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!department && (
        <p className="text-sm text-muted-foreground">
          Selecciona un departamento primero para filtrar puestos
        </p>
      )}
    </div>
  );
}
