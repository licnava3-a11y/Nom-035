import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function DepartmentSelect({
  value,
  onChange,
  label = "Departamento",
  placeholder = "Selecciona un departamento",
  required = false,
  error,
}: DepartmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Fetch departments from catalog
  const { data: departments, isLoading } = trpc.employees.getDepartments.useQuery();

  // Filter departments based on search
  const filteredDepartments = departments?.filter((dept) =>
    dept?.toLowerCase().includes(searchValue.toLowerCase())
  ).filter(Boolean) || [];

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="department-select">
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
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Buscar departamento..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Cargando departamentos...</CommandEmpty>
              ) : filteredDepartments.length === 0 ? (
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
                  ) : (
                    "No hay departamentos disponibles"
                  )}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredDepartments.map((dept) => dept && (
                    <CommandItem
                      key={dept}
                      value={dept}
                      onSelect={(currentValue) => {
                        onChange(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === dept ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {dept}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
