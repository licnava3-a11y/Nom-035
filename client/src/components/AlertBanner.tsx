import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AlertLevel = "info" | "warning" | "critical";

interface AlertBannerProps {
  level: AlertLevel;
  title: string;
  description: string;
  pulse?: boolean;
}

export function AlertBanner({ level, title, description, pulse = false }: AlertBannerProps) {
  const levelConfig = {
    info: {
      icon: Info,
      className: "border-blue-500 bg-blue-50 text-blue-900",
      iconClassName: "text-blue-600",
    },
    warning: {
      icon: AlertTriangle,
      className: "border-yellow-500 bg-yellow-50 text-yellow-900",
      iconClassName: "text-yellow-600",
    },
    critical: {
      icon: AlertCircle,
      className: "border-red-500 bg-red-50 text-red-900",
      iconClassName: "text-red-600",
    },
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <Alert className={`${config.className} ${pulse ? 'animate-pulse' : ''}`}>
      <Icon className={`h-4 w-4 ${config.iconClassName}`} />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
