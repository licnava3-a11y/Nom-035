import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Palmtree, Plus, Trash2, Save, RotateCcw, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface SeniorityRow {
  yearsMin: number;
  yearsMax: number | null;
  vacationDays: number;
}

const DEFAULT_LFT_TABLE: SeniorityRow[] = [
  { yearsMin: 1, yearsMax: 1, vacationDays: 12 },
  { yearsMin: 2, yearsMax: 2, vacationDays: 14 },
  { yearsMin: 3, yearsMax: 3, vacationDays: 16 },
  { yearsMin: 4, yearsMax: 4, vacationDays: 18 },
  { yearsMin: 5, yearsMax: 9, vacationDays: 20 },
  { yearsMin: 10, yearsMax: 14, vacationDays: 22 },
  { yearsMin: 15, yearsMax: 19, vacationDays: 24 },
  { yearsMin: 20, yearsMax: 24, vacationDays: 26 },
  { yearsMin: 25, yearsMax: null, vacationDays: 28 },
];

export default function VacationSeniorityManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: savedTable, refetch, isLoading } = trpc.vacations.getSeniorityTable.useQuery();
  const updateMut = trpc.vacations.updateSeniorityTable.useMutation({
    onSuccess: () => {
      toast({ title: "Tabla actualizada", description: "La tabla de antigüedad se guardó correctamente." });
      refetch();
    },
    onError: (e) => toast({ title: "Error al guardar", description: e.message, variant: "destructive" }),
  });

  const [rows, setRows] = useState<SeniorityRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Inicializar con datos del servidor cuando llegan
  const effectiveRows = isDirty ? rows : (savedTable ?? DEFAULT_LFT_TABLE);

  const handleChange = (idx: number, field: keyof SeniorityRow, value: string) => {
    const updated = effectiveRows.map((r, i) => {
      if (i !== idx) return r;
      if (field === "yearsMax") {
        return { ...r, yearsMax: value === "" || value === "∞" ? null : parseInt(value) || null };
      }
      return { ...r, [field]: parseInt(value) || 0 };
    });
    setRows(updated);
    setIsDirty(true);
  };

  const handleAddRow = () => {
    const last = effectiveRows[effectiveRows.length - 1];
    const newMin = last ? (last.yearsMax !== null ? last.yearsMax + 1 : (last.yearsMin + 5)) : 1;
    setRows([...effectiveRows, { yearsMin: newMin, yearsMax: null, vacationDays: 30 }]);
    setIsDirty(true);
  };

  const handleDeleteRow = (idx: number) => {
    setRows(effectiveRows.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const handleRestoreLFT = () => {
    setRows([...DEFAULT_LFT_TABLE]);
    setIsDirty(true);
    toast({ title: "Tabla LFT restaurada", description: "Se cargó la tabla predeterminada de la Ley Federal del Trabajo." });
  };

  const handleSave = () => {
    // Validar que no haya filas con días = 0
    const invalid = effectiveRows.some(r => r.vacationDays <= 0 || r.yearsMin < 0);
    if (invalid) {
      toast({ title: "Datos inválidos", description: "Todos los días deben ser mayores a 0 y los años deben ser positivos.", variant: "destructive" });
      return;
    }
    updateMut.mutate(effectiveRows);
    setIsDirty(false);
  };

  const isAdmin = user?.role === "admin";

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                <Palmtree className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Tabla de Vacaciones por Antigüedad</h1>
                <p className="text-sm text-muted-foreground">Configura los días de vacaciones según los años de servicio del empleado</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRestoreLFT} disabled={!isAdmin}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar LFT
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!isAdmin || updateMut.isPending || !isDirty}>
              <Save className="h-4 w-4 mr-1" />
              {updateMut.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>

        {/* Aviso de permisos */}
        {!isAdmin && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Solo lectura</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">Solo los administradores pueden modificar esta tabla. Contacta al administrador del sistema para realizar cambios.</p>
            </div>
          </div>
        )}

        {/* Info LFT */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-800 dark:text-blue-200">Ley Federal del Trabajo — Art. 76</p>
            <p className="text-blue-700 dark:text-blue-300 mt-0.5">
              La LFT establece un mínimo de 12 días para el primer año, incrementando 2 días por cada año subsiguiente hasta el quinto año, y 2 días adicionales por cada 5 años de servicio a partir del sexto año. Puedes personalizar esta tabla según la política interna de tu empresa, siempre respetando los mínimos legales.
            </p>
          </div>
        </div>

        {/* Tabla editable */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Configuración de Días por Antigüedad</CardTitle>
                <CardDescription>Define los rangos de años y los días de vacaciones correspondientes</CardDescription>
              </div>
              {isDirty && (
                <Badge variant="outline" className="text-amber-600 border-amber-400">
                  Cambios sin guardar
                </Badge>
              )}
              {!isDirty && savedTable && (
                <Badge variant="outline" className="text-green-600 border-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Guardado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Cargando tabla...</div>
            ) : (
              <div className="space-y-2">
                {/* Encabezados */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-3">Años mínimos</div>
                  <div className="col-span-3">Años máximos</div>
                  <div className="col-span-4">Días de vacaciones</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Filas */}
                {effectiveRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                    <div className="col-span-1 text-center">
                      <span className="text-xs text-muted-foreground font-mono">{idx + 1}</span>
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          value={row.yearsMin}
                          onChange={(e) => handleChange(idx, "yearsMin", e.target.value)}
                          disabled={!isAdmin}
                          className="h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">año(s)</span>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          placeholder="∞"
                          value={row.yearsMax !== null ? row.yearsMax : ""}
                          onChange={(e) => handleChange(idx, "yearsMax", e.target.value)}
                          disabled={!isAdmin}
                          className="h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">año(s)</span>
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={row.vacationDays}
                          onChange={(e) => handleChange(idx, "vacationDays", e.target.value)}
                          disabled={!isAdmin}
                          className="h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">días</span>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          {row.yearsMax !== null
                            ? `${row.yearsMin}–${row.yearsMax} años`
                            : `${row.yearsMin}+ años`}
                        </Badge>
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteRow(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Botón agregar fila */}
                {isAdmin && (
                  <button
                    onClick={handleAddRow}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border/50 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar rango de antigüedad
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vista previa de la tabla */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vista Previa — Tabla Vigente</CardTitle>
            <CardDescription>Así se verá la tabla de vacaciones para los empleados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Años de Servicio</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Días de Vacaciones</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Semanas</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Referencia LFT</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium">
                        {row.yearsMax !== null
                          ? row.yearsMin === row.yearsMax
                            ? `${row.yearsMin} año${row.yearsMin !== 1 ? 's' : ''}`
                            : `${row.yearsMin} – ${row.yearsMax} años`
                          : `${row.yearsMin} años o más`}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-bold text-base">
                          {row.vacationDays}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-muted-foreground">
                        {(row.vacationDays / 7).toFixed(1)} sem.
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {DEFAULT_LFT_TABLE.find(d => d.yearsMin === row.yearsMin && d.vacationDays === row.vacationDays)
                          ? <Badge variant="outline" className="text-green-600 border-green-400 text-xs">Conforme LFT</Badge>
                          : row.vacationDays >= (DEFAULT_LFT_TABLE.find(d => d.yearsMin <= row.yearsMin && (d.yearsMax === null || d.yearsMax >= row.yearsMin))?.vacationDays ?? 0)
                            ? <Badge variant="outline" className="text-blue-600 border-blue-400 text-xs">Por encima de LFT</Badge>
                            : <Badge variant="destructive" className="text-xs">Por debajo de LFT</Badge>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
