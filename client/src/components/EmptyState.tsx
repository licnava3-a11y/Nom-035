/**
 * EmptyState - Componente para mostrar estados vacíos informativos
 * Guía al usuario sobre qué hacer cuando no hay datos
 */

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>

        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {action && (
              <Button onClick={action.onClick}>
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * InlineEmptyState - Versión compacta para usar dentro de secciones
 */
interface InlineEmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function InlineEmptyState({
  icon: Icon,
  message,
  action
}: InlineEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Icon className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
