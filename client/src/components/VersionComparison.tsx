import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface VersionComparisonProps {
  version1: any;
  version2: any;
  differences: Record<string, boolean>;
}

export default function VersionComparison({ version1, version2, differences }: VersionComparisonProps) {
  const fields = [
    { key: "version", label: "Versión" },
    { key: "effectiveDate", label: "Fecha de Vigencia" },
    { key: "objectives", label: "Objetivos", multiline: true },
    { key: "structure", label: "Estructura Organizacional", multiline: true },
    { key: "roles", label: "Funciones y Responsabilidades", multiline: true },
    { key: "meetingFrequency", label: "Periodicidad de Reuniones", multiline: true },
    { key: "quorum", label: "Quórum Mínimo", multiline: true },
    { key: "decisionMaking", label: "Toma de Decisiones", multiline: true },
    { key: "communication", label: "Mecanismos de Comunicación", multiline: true },
    { key: "caseHandling", label: "Procedimiento de Atención de Casos", multiline: true },
    { key: "confidentiality", label: "Confidencialidad", multiline: true },
    { key: "amendments", label: "Procedimiento de Modificación", multiline: true },
    { key: "signatures", label: "Firmas", multiline: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>Los campos resaltados indican diferencias entre las versiones</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Versión 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Versión {version1.version} (V{version1.versionNumber})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field: any) => (
              <div
                key={field.key}
                className={`p-3 rounded-lg ${
                  differences[field.key]
                    ? "bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800"
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{field.label}</h4>
                  {differences[field.key] && (
                    <Badge variant="outline" className="text-xs">
                      Modificado
                    </Badge>
                  )}
                </div>
                <p
                  className={`text-sm text-muted-foreground ${
                    field.multiline ? "whitespace-pre-wrap" : ""
                  }`}
                >
                  {version1[field.key] || "-"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Versión 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Versión {version2.version} (V{version2.versionNumber})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field: any) => (
              <div
                key={field.key}
                className={`p-3 rounded-lg ${
                  differences[field.key]
                    ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{field.label}</h4>
                  {differences[field.key] && (
                    <Badge variant="outline" className="text-xs">
                      Modificado
                    </Badge>
                  )}
                </div>
                <p
                  className={`text-sm text-muted-foreground ${
                    field.multiline ? "whitespace-pre-wrap" : ""
                  }`}
                >
                  {version2[field.key] || "-"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Resumen de cambios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de Cambios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(differences).filter(([_, isDifferent]) => isDifferent).length === 0 ? (
              <p className="text-sm text-muted-foreground">No se encontraron diferencias entre las versiones</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {Object.entries(differences)
                  .filter(([_, isDifferent]) => isDifferent)
                  .map(([fieldKey]) => {
                    const field = fields.find((f: any) => f.key === fieldKey);
                    return (
                      <li key={fieldKey} className="text-sm text-muted-foreground">
                        <span className="font-medium">{field?.label || fieldKey}</span> fue modificado
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
