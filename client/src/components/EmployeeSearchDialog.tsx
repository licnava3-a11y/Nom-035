import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Mail, Phone, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmployeeSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (employeeId: number, employeeName: string) => void;
}

export default function EmployeeSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: EmployeeSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: employeesData, isLoading } = trpc.employees.list.useQuery(
    {
      search: searchTerm,
    },
    {
      enabled: open,
    }
  );
  const employees = employeesData as any as
    | Array<{
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        employeeNumber: string | null;
        department: string;
        position: string;
        curp: string | null;
      }>
    | undefined;

  const handleSelect = (employee: any) => {
    const fullName = `${employee.firstName} ${employee.lastName}`;
    onSelect(employee.id, fullName);
    onOpenChange(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buscar Trabajador</DialogTitle>
          <DialogDescription>
            Busca por nombre, apellido o número de empleado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar trabajador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando trabajadores...
            </div>
          ) : !employees || employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No se encontraron trabajadores con ese criterio"
                : "Escribe para buscar trabajadores"}
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((employee: any) => (
                <Card
                  key={employee.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSelect(employee)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </span>
                          {employee.employeeNumber && (
                            <span className="text-sm text-muted-foreground">
                              #{employee.employeeNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {employee.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{employee.email}</span>
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{employee.phone}</span>
                            </div>
                          )}
                          {employee.position && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              <span>{employee.position}</span>
                            </div>
                          )}
                        </div>

                        {employee.department && (
                          <div className="text-sm text-muted-foreground">
                            Departamento: {employee.department}
                          </div>
                        )}
                      </div>

                      <Button size="sm" variant="outline">
                        Seleccionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
