import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

export default function SalaryGap() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [formData, setFormData] = useState({
    periodo: "",
    departamento: "",
    puesto: "",
    totalMujeres: "",
    totalHombres: "",
    salarioPromedioHombres: "",
    salarioPromedioMujeres: "",
  });

  const utils = trpc.useUtils();
  const { data: gaps = [], isLoading } = trpc.equality.salaryGap.list.useQuery();

  const calculateMutation = trpc.equality.salaryGap.calculate.useMutation({
    onSuccess: () => {
      alert("Brecha salarial calculada exitosamente");
      utils.equality.salaryGap.list.invalidate();
      setIsCalculating(false);
      setFormData({
        periodo: "",
        departamento: "",
        puesto: "",
        totalMujeres: "",
        totalHombres: "",
        salarioPromedioHombres: "",
        salarioPromedioMujeres: "",
      });
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateMutation.mutate({
      periodo: formData.periodo,
      departamento: formData.departamento,
      puesto: formData.puesto,
      totalMujeres: parseInt(formData.totalMujeres),
      totalHombres: parseInt(formData.totalHombres),
      salarioPromedioHombres: parseFloat(formData.salarioPromedioHombres),
      salarioPromedioMujeres: parseFloat(formData.salarioPromedioMujeres),
    });
  };

  const getRiskBadge = (nivelRiesgo: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; icon: any; color: string }> = {
      bajo: { variant: "default", icon: CheckCircle, color: "text-green-600" },
      medio: { variant: "secondary", icon: AlertTriangle, color: "text-yellow-600" },
      alto: { variant: "destructive", icon: TrendingUp, color: "text-red-600" },
    };
    const config = variants[nivelRiesgo] || variants.bajo;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {nivelRiesgo.charAt(0).toUpperCase() + nivelRiesgo.slice(1)}
      </Badge>
    );
  };

  // Calcular estadísticas
  const totalGaps = gaps.length;
  const avgGap = gaps.length > 0
    ? (gaps.reduce((sum, g) => sum + parseFloat(g.brechaPorcentual.toString()), 0) / gaps.length).toFixed(2)
    : "0.00";
  const highRiskCount = gaps.filter(g => g.nivelRiesgo === "alto").length;
  const mediumRiskCount = gaps.filter(g => g.nivelRiesgo === "medio").length;

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Indicadores de Brecha Salarial</h1>
          <p className="text-muted-foreground">NMX-025-SCFI-2015 - Requisito 4.2.1</p>
        </div>
        <Button onClick={() => setIsCalculating(!isCalculating)}>
          {isCalculating ? "Cancelar" : "Calcular Brecha"}
        </Button>
      </div>

      {/* Dashboard de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Cálculos</CardDescription>
            <CardTitle className="text-3xl">{totalGaps}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Brecha Promedio</CardDescription>
            <CardTitle className="text-3xl">{avgGap}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Riesgo Alto</CardDescription>
            <CardTitle className="text-3xl text-red-600">{highRiskCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Riesgo Medio</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{mediumRiskCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Formulario de Cálculo */}
      {isCalculating && (
        <Card>
          <CardHeader>
            <CardTitle>Calcular Brecha Salarial</CardTitle>
            <CardDescription>
              Ingresa los datos para calcular la brecha salarial por género
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodo">Periodo *</Label>
                  <Input
                    id="periodo"
                    value={formData.periodo}
                    onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                    placeholder="Ej: 2026-Q1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="departamento">Departamento *</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    placeholder="Ej: Tecnología"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="puesto">Puesto *</Label>
                  <Input
                    id="puesto"
                    value={formData.puesto}
                    onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                    placeholder="Ej: Desarrollador"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="totalMujeres">Total de Mujeres *</Label>
                  <Input
                    id="totalMujeres"
                    type="number"
                    value={formData.totalMujeres}
                    onChange={(e) => setFormData({ ...formData, totalMujeres: e.target.value })}
                    placeholder="Ej: 50"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="totalHombres">Total de Hombres *</Label>
                  <Input
                    id="totalHombres"
                    type="number"
                    value={formData.totalHombres}
                    onChange={(e) => setFormData({ ...formData, totalHombres: e.target.value })}
                    placeholder="Ej: 45"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="salarioPromedioHombres">Salario Promedio Hombres *</Label>
                  <Input
                    id="salarioPromedioHombres"
                    type="number"
                    step="0.01"
                    value={formData.salarioPromedioHombres}
                    onChange={(e) => setFormData({ ...formData, salarioPromedioHombres: e.target.value })}
                    placeholder="Ej: 25000.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="salarioPromedioMujeres">Salario Promedio Mujeres *</Label>
                  <Input
                    id="salarioPromedioMujeres"
                    type="number"
                    step="0.01"
                    value={formData.salarioPromedioMujeres}
                    onChange={(e) => setFormData({ ...formData, salarioPromedioMujeres: e.target.value })}
                    placeholder="Ej: 23000.00"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={calculateMutation.isPending}>
                  {calculateMutation.isPending ? "Calculando..." : "Calcular Brecha"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCalculating(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Brechas Calculadas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cálculos</CardTitle>
          <CardDescription>Brechas salariales calculadas por periodo</CardDescription>
        </CardHeader>
        <CardContent>
          {gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay cálculos registrados
            </p>
          ) : (
            <div className="space-y-3">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{gap.puesto}</h3>
                      {getRiskBadge(gap.nivelRiesgo)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {gap.departamento} • {gap.periodo}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {parseFloat(gap.brechaPorcentual.toString()) > 0 ? (
                        <TrendingUp className="h-5 w-5 text-red-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-green-600" />
                      )}
                      <span className="text-2xl font-bold">
                        {parseFloat(gap.brechaPorcentual.toString()).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Brecha salarial
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
