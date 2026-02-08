import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Building2, Users, User, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ActionsByLevelProps {
  surveyId: number;
  organizationalRisk?: "nulo" | "bajo" | "medio" | "alto" | "muy_alto";
  groupRisks?: Array<{
    department: string;
    riskLevel: "nulo" | "bajo" | "medio" | "alto" | "muy_alto";
    categories: string[];
  }>;
  individualRisks?: Array<{
    employeeId: number;
    employeeName: string;
    hasATS: boolean; // Acontecimientos Traumáticos Severos
    riskLevel: "nulo" | "bajo" | "medio" | "alto" | "muy_alto";
  }>;
}

const getRiskColor = (level: string) => {
  switch (level) {
    case "nulo":
      return "bg-green-100 text-green-800 border-green-200";
    case "bajo":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "medio":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "alto":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "muy_alto":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getRiskLabel = (level: string) => {
  switch (level) {
    case "nulo":
      return "Nulo";
    case "bajo":
      return "Bajo";
    case "medio":
      return "Medio";
    case "alto":
      return "Alto";
    case "muy_alto":
      return "Muy Alto";
    default:
      return "Sin evaluar";
  }
};

export function ActionsByLevel({
  surveyId,
  organizationalRisk = "medio",
  groupRisks = [],
  individualRisks = [],
}: ActionsByLevelProps) {
  const [activeTab, setActiveTab] = useState("organizational");
  const [organizationalActions, setOrganizationalActions] = useState("");
  const [groupActions, setGroupActions] = useState<Record<string, string>>({});
  const [individualActions, setIndividualActions] = useState<Record<number, string>>({});

  // Detectar casos críticos con ATS
  const atsCount = individualRisks.filter((r) => r.hasATS).length;
  const hasATSCases = atsCount > 0;

  return (
    <div className="space-y-6">
      {/* Alert para casos con ATS */}
      {hasATSCases && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>⚠️ Casos Críticos Detectados</AlertTitle>
          <AlertDescription>
            Se detectaron <strong>{atsCount} trabajador(es)</strong> con Acontecimientos Traumáticos Severos (ATS).
            Requieren atención psicológica inmediata y seguimiento del comité.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Acciones Correctivas en 3 Niveles</CardTitle>
          <CardDescription>
            Acciones organizacionales, grupales e individuales según resultados de evaluación NOM-035
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="organizational">
                <Building2 className="mr-2 h-4 w-4" />
                Nivel 1: Organizacional
              </TabsTrigger>
              <TabsTrigger value="group">
                <Users className="mr-2 h-4 w-4" />
                Nivel 2: Grupal
                {groupRisks.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {groupRisks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="individual">
                <User className="mr-2 h-4 w-4" />
                Nivel 3: Individual
                {hasATSCases && (
                  <Badge variant="destructive" className="ml-2">
                    {atsCount} ATS
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Nivel 1: Organizacional */}
            <TabsContent value="organizational" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Acciones Generales para Toda la Empresa</h3>
                  <p className="text-sm text-muted-foreground">
                    Basadas en el promedio global de riesgo psicosocial
                  </p>
                </div>
                <Badge className={getRiskColor(organizationalRisk)}>
                  Riesgo {getRiskLabel(organizationalRisk)}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="org-actions">Plan de Acción Organizacional</Label>
                  <Textarea
                    id="org-actions"
                    placeholder="Describe las acciones correctivas a nivel organizacional (programas de capacitación, políticas, medidas de prevención, etc.)"
                    value={organizationalActions}
                    onChange={(e) => setOrganizationalActions(e.target.value)}
                    rows={8}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Ejemplos: Implementar programa de manejo de estrés, establecer políticas de desconexión digital,
                    crear comités de salud y seguridad.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline">
                    <Clock className="mr-2 h-4 w-4" />
                    Guardar Borrador
                  </Button>
                  <Button>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Aprobar y Aplicar
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Nivel 2: Grupal/Departamental */}
            <TabsContent value="group" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Acciones por Departamento/Segmento</h3>
                <p className="text-sm text-muted-foreground">
                  Basadas en análisis de categorías de riesgo por grupo
                </p>
              </div>

              {groupRisks.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sin riesgos grupales detectados</AlertTitle>
                  <AlertDescription>
                    No se identificaron departamentos con niveles de riesgo que requieran acciones específicas.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {groupRisks.map((group, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{group.department}</CardTitle>
                          <Badge className={getRiskColor(group.riskLevel)}>
                            Riesgo {getRiskLabel(group.riskLevel)}
                          </Badge>
                        </div>
                        <CardDescription>
                          Categorías afectadas: {group.categories.join(", ")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Label htmlFor={`group-actions-${index}`}>Plan de Acción para {group.department}</Label>
                          <Textarea
                            id={`group-actions-${index}`}
                            placeholder={`Describe acciones específicas para ${group.department}`}
                            value={groupActions[group.department] || ""}
                            onChange={(e) =>
                              setGroupActions({ ...groupActions, [group.department]: e.target.value })
                            }
                            rows={4}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">
                      <Clock className="mr-2 h-4 w-4" />
                      Guardar Borrador
                    </Button>
                    <Button>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aprobar y Aplicar
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Nivel 3: Individual (ATS) */}
            <TabsContent value="individual" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Acciones Individuales (ATS)</h3>
                <p className="text-sm text-muted-foreground">
                  Trabajadores con Acontecimientos Traumáticos Severos que requieren atención inmediata
                </p>
              </div>

              {individualRisks.filter((r) => r.hasATS).length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Sin casos ATS detectados</AlertTitle>
                  <AlertDescription>
                    No se identificaron trabajadores con acontecimientos traumáticos severos en esta evaluación.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {individualRisks
                    .filter((r) => r.hasATS)
                    .map((individual) => (
                      <Card key={individual.employeeId} className="border-red-200">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{individual.employeeName}</CardTitle>
                            <div className="flex gap-2">
                              <Badge variant="destructive">ATS</Badge>
                              <Badge className={getRiskColor(individual.riskLevel)}>
                                Riesgo {getRiskLabel(individual.riskLevel)}
                              </Badge>
                            </div>
                          </div>
                          <CardDescription>
                            Caso crítico - Requiere atención psicológica inmediata y seguimiento del comité
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label htmlFor={`individual-actions-${individual.employeeId}`}>
                              Plan de Atención Individual
                            </Label>
                            <Textarea
                              id={`individual-actions-${individual.employeeId}`}
                              placeholder="Describe acciones específicas: derivación a EAP, seguimiento psicológico, ajustes de puesto, etc."
                              value={individualActions[individual.employeeId] || ""}
                              onChange={(e) =>
                                setIndividualActions({
                                  ...individualActions,
                                  [individual.employeeId]: e.target.value,
                                })
                              }
                              rows={4}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">
                      <Clock className="mr-2 h-4 w-4" />
                      Guardar Borrador
                    </Button>
                    <Button variant="destructive">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Crear Casos NOM-035 Críticos
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
