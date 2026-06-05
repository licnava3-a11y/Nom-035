import * as React from "react";
import { Input } from "@/components/ui/input"
import { type InputHTMLAttributes } from "react"
type InputProps = InputHTMLAttributes<HTMLInputElement>;
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useRealtimeValidation, ValidationRules } from "@/hooks/useRealtimeValidation";

export interface InputWithValidationProps extends Omit<InputProps, "onChange"> {
  label?: string;
  validationRules?: ValidationRules;
  onValueChange?: (value: string, isValid: boolean) => void;
  showValidationIcon?: boolean;
  validateOnBlur?: boolean;
}

const InputWithValidation = React.forwardRef<HTMLInputElement, InputWithValidationProps>(
  (
    {
      className,
      label,
      validationRules,
      onValueChange,
      showValidationIcon = true,
      validateOnBlur = false,
      id,
      ...props
    },
    ref
  ) => {
    const { validateField, getValidation } = useRealtimeValidation();
    const [value, setValue] = React.useState<string>((props.value as string) || "");
    const [touched, setTouched] = React.useState(false);
    const fieldName = id || props.name || "field";

    const validation = getValidation(fieldName);
    const showValidation = touched && validation.type !== "idle";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);

      // Validar en tiempo real si no es validateOnBlur
      if (!validateOnBlur && validationRules) {
        const result = validateField(fieldName, newValue, validationRules);
        onValueChange?.(newValue, result.isValid);
      } else {
        onValueChange?.(newValue, true);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      if (validationRules) {
        const result = validateField(fieldName, value, validationRules);
        onValueChange?.(value, result.isValid);
      }
      // Llamar al onBlur externo si se pasó como prop
      (props as any).onBlur?.(e);
    };

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={id} className={cn(showValidation && validation.type === "error" && "text-destructive")}>
            {label}
            {validationRules?.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            id={id}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              className,
              showValidation && validation.type === "error" && "border-destructive focus-visible:ring-destructive",
              showValidation && validation.type === "success" && "border-green-500 focus-visible:ring-green-500",
              showValidationIcon && "pr-10"
            )}
            {...props}
          />
          {showValidationIcon && showValidation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validation.type === "success" && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {validation.type === "error" && (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              {validation.type === "idle" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        </div>
        {showValidation && validation.message && (
          <p
            className={cn(
              "text-sm",
              validation.type === "error" && "text-destructive",
              validation.type === "success" && "text-green-600"
            )}
          >
            {validation.message}
          </p>
        )}
      </div>
    );
  }
);

InputWithValidation.displayName = "InputWithValidation";

export { InputWithValidation };
