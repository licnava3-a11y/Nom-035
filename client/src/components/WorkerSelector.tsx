import { useWorkerSearch } from "@/hooks/useWorkerSearch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface WorkerSelectorProps {
  value?: number | null;
  onChange: (
    workerId: number | null,
    workerData?: {
      fullName: string;
      email: string;
      department: string | null;
      curp: string | null;
      employeeNumber: string | null;
      position: string | null;
    }
  ) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Componente selector de trabajadores con búsqueda y autocompletado
 * Permite seleccionar un trabajador y devuelve sus datos completos para prellenado
 */
export function WorkerSelector({
  value,
  onChange,
  placeholder = "Seleccionar trabajador...",
  disabled = false,
}: WorkerSelectorProps) {
  const [open, setOpen] = useState(false);
  const { filteredWorkers, isLoading, setSearchTerm } = useWorkerSearch();

  const selectedWorker = filteredWorkers?.find((w: any) => w.id === value);

  const handleSelect = (workerId: number) => {
    const worker = filteredWorkers?.find((w: any) => w.id === workerId);
    if (worker) {
      onChange(workerId, {
        fullName: `${worker.firstName} ${worker.lastName}`,
        email: worker.email,
        department: worker.department,
        curp: worker.curp,
        employeeNumber: worker.employeeNumber,
        position: worker.position,
      });
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedWorker ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-medium">
                {selectedWorker.firstName} {selectedWorker.lastName}
              </span>
              <span className="text-muted-foreground text-sm">
                ({selectedWorker.employeeNumber})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {selectedWorker && !disabled && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder="Buscar por nombre, email o número..."
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Cargando..." : "No se encontraron trabajadores"}
            </CommandEmpty>
            <CommandGroup>
              {filteredWorkers?.map((worker: any) => (
                <CommandItem
                  key={worker.id}
                  value={worker.id.toString()}
                  onSelect={() => handleSelect(worker.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === worker.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {worker.firstName} {worker.lastName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {worker.employeeNumber} • {worker.department} •{" "}
                      {worker.email}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
