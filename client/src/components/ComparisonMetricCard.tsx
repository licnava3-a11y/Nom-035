import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";

interface ComparisonMetricCardProps {
  title: string;
  icon: LucideIcon;
  currentValue: number | string;
  comparisonValue?: number | string;
  change?: {
    absolute: number;
    percentage: number;
  };
  subtitle: string;
  comparisonSubtitle?: string;
  format?: "number" | "percentage";
  comparisonEnabled: boolean;
}

export function ComparisonMetricCard({
  title,
  icon: Icon,
  currentValue,
  comparisonValue,
  change,
  subtitle,
  comparisonSubtitle,
  format = "number",
  comparisonEnabled,
}: ComparisonMetricCardProps) {
  const isPositiveChange = change && change.percentage >= 0;
  const hasSignificantChange = change && Math.abs(change.percentage) > 0.1;

  const formatValue = (value: number | string) => {
    if (typeof value === "string") return value;
    if (format === "percentage") return `${value}%`;
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {!comparisonEnabled ? (
          // Vista normal sin comparación
          <>
            <div className="text-2xl font-bold">
              {formatValue(currentValue)}
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </>
        ) : (
          // Vista con comparación
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Período Actual
                </span>
                {hasSignificantChange && change && (
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1 ${
                      isPositiveChange
                        ? "text-green-600 border-green-600"
                        : "text-red-600 border-red-600"
                    }`}
                  >
                    {isPositiveChange ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {change.percentage > 0 ? "+" : ""}
                    {change.percentage.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold">
                {formatValue(currentValue)}
              </div>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>

            {comparisonValue !== undefined && (
              <div className="pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Período de Comparación
                </span>
                <div className="text-lg font-semibold text-muted-foreground">
                  {formatValue(comparisonValue)}
                </div>
                {comparisonSubtitle && (
                  <p className="text-xs text-muted-foreground">
                    {comparisonSubtitle}
                  </p>
                )}
                {change && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {change.absolute > 0 ? "+" : ""}
                    {format === "percentage"
                      ? change.absolute.toFixed(2)
                      : change.absolute}{" "}
                    {format === "percentage"
                      ? "puntos porcentuales"
                      : "eventos"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
