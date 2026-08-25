import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import ProtectedButton from "@/components/ProtectedButton";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICONS } from "@/lib/iconography";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ReentryBadge } from "@/components/ReentryBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { EmptyState } from "@/components/EmptyState";
import { EMPTY_STATES } from "@/lib/emptyStates";
// Using alert for now instead of toast

export default function Employees() {
  const toast = (opts: {
    title: string;
    description: string;
    variant?: string;
  }) => {
    alert(`${opts.title}\n${opts.description}`);
  };
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<
    string | undefined
  >();
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(true);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showRfcNss, setShowRfcNss] = useState(false);
  const [incompleteOnly, setIncompleteOnly] = useState(false);

  // Campos requeridos para calcular completitud en el frontend
  const getMissingFields = (emp: any): string[] => {
    const missing: string[] = [];
    if (!emp.curp) missing.push("CURP");
    if (!emp.rfc) missing.push("RFC");
    if (!emp.nss) missing.push("NSS");
    if (!emp.phone) missing.push("Teléfono");
    if (!emp.departmentId) missing.push("Departamento");
    if (!emp.positionId) missing.push("Puesto");
    if (!emp.hireDate) missing.push("Fecha ingreso");
    if (!emp.educationLevel) missing.push("Escolaridad");
    if (!emp.gender) missing.push("Género");
    return missing;
  };

  // Fetch employees with filters
  const {
    data: employeesData,
    isLoading,
    refetch,
  } = trpc.employees.list.useQuery({
    search: search || undefined,
    department: departmentFilter,
    isActive: statusFilter,
    page: currentPage,
    pageSize,
    incompleteOnly: incompleteOnly || undefined,
  });

  const employees = employeesData?.employees;
  const pagination = employeesData?.pagination;

  // Fetch departments for filter
  const { data: departments } = trpc.employees.getDepartments.useQuery();

  const utils = trpc.useUtils();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Por favor seleccione un archivo");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async event => {
        const base64 = event.target?.result as string;
        const fileData = base64.split(",")[1]; // Remove data:*/*;base64, prefix

        importMutation.mutate({
          fileData,
          fileName: importFile.name,
        });
      };
      reader.readAsDataURL(importFile);
    } catch (error: any) {
      alert(`Error al leer archivo: ${error.message}`);
    }
  };
  // Mutation para exportar catálogo de empleados a Excel
  const exportExcelMutation = trpc.employees.exportToExcel.useMutation({
    onSuccess: data => {
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.data}`;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Exportación completada",
        description: `${data.count} trabajadores exportados`,
      });
    },
    onError: error => {
      toast({
        title: "Error al exportar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para generar plantilla Excel
  const generateTemplateMutation =
    trpc.employees.generateImportTemplate.useMutation({
      onSuccess: data => {
        // Descargar archivo
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.data}`;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Plantilla generada",
          description: "La plantilla se ha descargado correctamente",
        });
      },
      onError: error => {
        toast({
          title: "Error",
          description: error.message || "No se pudo generar la plantilla",
          variant: "destructive",
        });
      },
    });

  // Mutation para importar empleados
  const importMutation = trpc.employees.importFromFile.useMutation({
    onSuccess: result => {
      setImportResult(result);
      refetch();
      toast({
        title: "Importación completada",
        description: `${result.successful} empleados importados exitosamente. ${result.failed} errores.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en importación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deactivate employee mutation with optimistic update
  const deactivateMutation = trpc.employees.deactivate.useMutation({
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await utils.employees.list.cancel();

      // Snapshot previous value
      const previousEmployees = utils.employees.list.getData();

      // Optimistically update to the new value
      utils.employees.list.setData(
        {
          search: search || undefined,
          department: departmentFilter,
          isActive: statusFilter,
        },
        old =>
          old
            ? {
                ...old,
                employees: old.employees.map((emp: any) =>
                  emp.id === id ? { ...emp, isActive: false } : emp
                ),
              }
            : old
      );

      return { previousEmployees };
    },
    onSuccess: () => {
      toast({
        title: "Empleado desactivado",
        description: "El empleado ha sido desactivado exitosamente",
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousEmployees) {
        utils.employees.list.setData(
          {
            search: search || undefined,
            department: departmentFilter,
            isActive: statusFilter,
          },
          context.previousEmployees
        );
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo desactivar el empleado",
        // variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      utils.employees.list.invalidate();
    },
  });

  // Reactivate employee mutation with optimistic update
  const reactivateMutation = trpc.employees.reactivate.useMutation({
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await utils.employees.list.cancel();

      // Snapshot previous value
      const previousEmployees = utils.employees.list.getData();

      // Optimistically update to the new value
      utils.employees.list.setData(
        {
          search: search || undefined,
          department: departmentFilter,
          isActive: statusFilter,
        },
        old =>
          old
            ? {
                ...old,
                employees: old.employees.map((emp: any) =>
                  emp.id === id ? { ...emp, isActive: true } : emp
                ),
              }
            : old
      );

      return { previousEmployees };
    },
    onSuccess: () => {
      toast({
        title: "Empleado reactivado",
        description: "El empleado ha sido reactivado exitosamente",
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousEmployees) {
        utils.employees.list.setData(
          {
            search: search || undefined,
            department: departmentFilter,
            isActive: statusFilter,
          },
          context.previousEmployees
        );
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo reactivar el empleado",
        // variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      utils.employees.list.invalidate();
    },
  });

  const handleDeactivate = (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de desactivar a ${name}?`)) {
      deactivateMutation.mutate({ id });
    }
  };

  const handleReactivate = (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de reactivar a ${name}?`)) {
      reactivateMutation.mutate({ id });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Breadcrumb
        items={[
          { label: "Gestión de Talento", href: "/" },
          { label: "Trabajadores" },
        ]}
      />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Trabajadores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la información de todos los empleados de la organización
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={incompleteOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => {
              setIncompleteOnly(v => !v);
              setCurrentPage(1);
            }}
          >
            <ICONS.status.warning className="mr-2 h-4 w-4" />
            Perfiles incompletos
            {incompleteOnly && pagination?.totalCount !== undefined && (
              <span className="ml-1.5 bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pagination.totalCount}
              </span>
            )}
          </Button>
          <Button
            variant={showRfcNss ? "default" : "outline"}
            size="sm"
            onClick={() => setShowRfcNss(v => !v)}
            title={showRfcNss ? "Ocultar RFC y NSS" : "Mostrar RFC y NSS"}
          >
            <ICONS.documents.generic className="mr-2 h-4 w-4" />
            {showRfcNss ? "Ocultar RFC/NSS" : "Mostrar RFC/NSS"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcelMutation.mutate({ format: "contpaqui" })}
            disabled={exportExcelMutation.isPending}
            title="Exportar catálogo de empleados en formato CONTPAQi/NOI"
          >
            {exportExcelMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ICONS.documents.generic className="mr-2 h-4 w-4" />
            )}
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <ICONS.actions.upload className="mr-2 h-4 w-4" />
            Importar Empleados
          </Button>
          <Link href="/employees/new">
            <ProtectedButton
              requiredPermission="can_create"
              fallbackMessage="Solo los administradores pueden agregar trabajadores"
              hideIfNoPermission
            >
              <ICONS.actions.create className="mr-2 h-4 w-4" />
              Agregar Trabajador
            </ProtectedButton>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busca y filtra trabajadores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <ICONS.actions.search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, número, RFC o NSS..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={departmentFilter || "all"}
              onValueChange={value =>
                setDepartmentFilter(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments?.map((dept: any) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={
                statusFilter === undefined
                  ? "all"
                  : statusFilter
                    ? "active"
                    : "inactive"
              }
              onValueChange={value =>
                setStatusFilter(
                  value === "all" ? undefined : value === "active"
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !employees || employees.length === 0 ? (
        search || departmentFilter || incompleteOnly ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ICONS.users.single className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No se encontraron trabajadores
              </h3>
              <p className="text-muted-foreground">
                Intenta ajustar los filtros de búsqueda
              </p>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            {...EMPTY_STATES.employees}
            action={{
              label: "Agregar Primer Trabajador",
              onClick: () => (window.location.href = "/employees/new"),
            }}
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((employee: any) => (
            <Card
              key={employee.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <ICONS.users.single className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {employee.firstName} {employee.lastName}
                      </CardTitle>
                      <CardDescription>
                        {employee.position || "Sin puesto"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge
                      variant={employee.isActive ? "default" : "secondary"}
                    >
                      {employee.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    <ReentryBadge
                      reentryCount={employee.reentryCount || 0}
                      previousHireDates={employee.previousHireDates}
                    />
                    {(() => {
                      const missing = getMissingFields(employee);
                      return missing.length > 0 ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="border-amber-400 text-amber-600 text-xs cursor-help"
                              >
                                <ICONS.status.warning className="mr-1 h-3 w-3" />
                                {missing.length} campo
                                {missing.length > 1 ? "s" : ""}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs">
                              <p className="font-semibold mb-1 text-xs">
                                Campos faltantes:
                              </p>
                              <ul className="text-xs space-y-0.5">
                                {missing.map((field: string) => (
                                  <li
                                    key={field}
                                    className="flex items-center gap-1"
                                  >
                                    <span className="text-amber-400">•</span>{" "}
                                    {field}
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-green-400 text-green-600 text-xs"
                        >
                          Completo
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {employee.email && (
                    <div className="flex items-center text-muted-foreground">
                      <ICONS.communication.email className="mr-2 h-4 w-4" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center text-muted-foreground">
                      <ICONS.communication.phone className="mr-2 h-4 w-4" />
                      {employee.phone}
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center text-muted-foreground">
                      <ICONS.organization.building className="mr-2 h-4 w-4" />
                      {employee.department}
                    </div>
                  )}
                  {employee.employeeNumber && (
                    <div className="flex items-center text-muted-foreground">
                      <ICONS.organization.position className="mr-2 h-4 w-4" />
                      No. {employee.employeeNumber}
                    </div>
                  )}
                  {employee.hireDate && (
                    <div className="flex items-center text-muted-foreground">
                      <ICONS.datetime.calendar className="mr-2 h-4 w-4" />
                      Ingreso:{" "}
                      {new Date(employee.hireDate).toLocaleDateString("es-MX")}
                    </div>
                  )}
                  {showRfcNss && employee.rfc && (
                    <div className="flex items-center text-muted-foreground font-mono text-xs">
                      <ICONS.documents.generic className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="font-semibold mr-1">RFC:</span>{" "}
                      {employee.rfc}
                    </div>
                  )}
                  {showRfcNss && employee.nss && (
                    <div className="flex items-center text-muted-foreground font-mono text-xs">
                      <ICONS.documents.generic className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="font-semibold mr-1">NSS:</span>{" "}
                      {employee.nss}
                    </div>
                  )}
                  {showRfcNss && !employee.rfc && !employee.nss && (
                    <div className="text-xs text-amber-600 italic">
                      RFC y NSS no capturados
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Link href={`/employees/${employee.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver Perfil
                    </Button>
                  </Link>
                  <Link
                    href={`/employees/${employee.id}/edit`}
                    className="flex-1"
                  >
                    <ProtectedButton
                      variant="outline"
                      size="sm"
                      className="w-full"
                      requiredPermission="can_edit"
                      fallbackMessage="No tienes permisos para editar trabajadores"
                    >
                      Editar
                    </ProtectedButton>
                  </Link>
                  {employee.isActive ? (
                    <ProtectedButton
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleDeactivate(
                          employee.id,
                          `${employee.firstName} ${employee.lastName}`
                        )
                      }
                      disabled={deactivateMutation.isPending}
                      requiredPermission="can_edit"
                      fallbackMessage="Solo los administradores pueden desactivar trabajadores"
                      hideIfNoPermission
                    >
                      Desactivar
                    </ProtectedButton>
                  ) : (
                    <ProtectedButton
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleReactivate(
                          employee.id,
                          `${employee.firstName} ${employee.lastName}`
                        )
                      }
                      disabled={reactivateMutation.isPending}
                      requiredPermission="can_edit"
                      fallbackMessage="Solo los administradores pueden reactivar trabajadores"
                      hideIfNoPermission
                    >
                      Reactivar
                    </ProtectedButton>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Importación */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Importar Empleados desde Excel/CSV</DialogTitle>
                <DialogDescription className="mt-2">
                  Sube un archivo Excel o CSV con la información de los
                  empleados.
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateTemplateMutation.mutate()}
                disabled={generateTemplateMutation.isPending}
              >
                {generateTemplateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  "Descargar Plantilla"
                )}
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
              {importFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Archivo seleccionado: {importFile.name}
                </p>
              )}
            </div>

            {importResult && (
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold">Resultado de la Importación</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{importResult.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exitosos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {importResult.successful}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Errores</p>
                    <p className="text-2xl font-bold text-red-600">
                      {importResult.failed}
                    </p>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-semibold text-sm mb-2">
                      Errores Detectados:
                    </h5>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors
                        .slice(0, 10)
                        .map((err: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-xs bg-red-50 p-2 rounded"
                          >
                            <span className="font-semibold">
                              Fila {err.row}:
                            </span>{" "}
                            {err.error}
                          </div>
                        ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-xs text-muted-foreground">
                          ...y {importResult.errors.length - 10} errores más
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportFile(null);
                setImportResult(null);
              }}
            >
              Cerrar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importMutation.isPending}
            >
              {importMutation.isPending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Controles de Paginación */}
      {pagination && (
        <PaginationControls
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          onPageChange={page => setCurrentPage(page)}
          onPageSizeChange={size => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}
