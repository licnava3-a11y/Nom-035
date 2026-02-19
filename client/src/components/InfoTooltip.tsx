/**
 * InfoTooltip - Componente de tooltip informativo
 * Muestra ayuda contextual al pasar el mouse sobre el icono
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function InfoTooltip({ content, side = 'right', className = '' }: InfoTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
            aria-label="Más información"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={5}
            className="z-50 max-w-xs rounded-md bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          >
            {content}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/**
 * LabelWithTooltip - Label con tooltip integrado
 * Combina un label con un tooltip informativo
 */
interface LabelWithTooltipProps {
  label: string;
  tooltip: string;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}

export function LabelWithTooltip({
  label,
  tooltip,
  htmlFor,
  required = false,
  className = ''
}: LabelWithTooltipProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <InfoTooltip content={tooltip} />
    </div>
  );
}
