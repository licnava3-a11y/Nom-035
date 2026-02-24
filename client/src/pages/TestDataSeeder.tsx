import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Database } from "lucide-react";

export default function TestDataSeeder() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const seedMutation = trpc.testData.seedSession29.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setResult(null);
    }
  });

  const handleSeed = () => {
    setResult(null);
    setError(null);
    seedMutation.mutate();
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generador de Datos de Prueba</h1>
        <p className="text-muted-foreground mt-2">
          Herramienta para insertar datos de prueba de Sesión 29 (Evaluación 360°, Alertas Tempranas, Reportes Automáticos)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Datos de Prueba - Sesión 29
          </CardTitle>
          <CardDescription>
            Este proceso insertará datos de prueba en las siguientes tablas:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>2 ciclos de evaluación 360° (1 activo, 1 completado)</li>
            <li>10 asignaciones de empleados a ciclos</li>
            <li>3 configuraciones de umbrales de alertas tempranas (30% riesgo alto)</li>
            <li>2 reportes programados (mensual y trimestral)</li>
            <li>3 registros de historial de reportes enviados</li>
          </ul>

          <Button 
            onClick={handleSeed} 
            disabled={seedMutation.isPending}
            className="w-full"
          >
            {seedMutation.isPending ? "Insertando datos..." : "Generar Datos de Prueba"}
          </Button>

          {result && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>{result.message}</strong>
                <div className="mt-2 space-y-1 text-sm">
                  <p>• Ciclos creados: {result.data.cycles}</p>
                  <p>• Asignaciones: {result.data.assignments}</p>
                  <p>• Umbrales configurados: {result.data.thresholds}</p>
                  <p>• Reportes programados: {result.data.scheduledReports}</p>
                  <p>• Historial de reportes: {result.data.reportHistory}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validación de Datos</CardTitle>
          <CardDescription>
            Después de generar los datos, verifica las siguientes páginas:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <a href="/performance-evaluation-360" className="text-primary hover:underline">
                Evaluación 360° - Verificar ciclos y asignaciones
              </a>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <a href="/risk-alerts" className="text-primary hover:underline">
                Alertas Tempranas - Verificar umbrales configurados
              </a>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <a href="/scheduled-reports" className="text-primary hover:underline">
                Reportes Automáticos - Verificar reportes programados
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
