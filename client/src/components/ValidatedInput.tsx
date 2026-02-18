import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidatedInputProps {
  label: string;
  type: 'email' | 'phone' | 'text';
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ValidatedInput({
  label,
  type,
  value,
  onChange,
  required = false,
  placeholder,
  className,
  disabled = false,
}: ValidatedInputProps) {
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!value) {
      setValidationState('idle');
      setErrorMessage('');
      return;
    }

    const validate = () => {
      switch (type) {
        case 'email':
          return validateEmail(value);
        case 'phone':
          return validatePhone(value);
        case 'text':
          return validateText(value);
        default:
          return { valid: true, message: '' };
      }
    };

    const result = validate();
    setValidationState(result.valid ? 'valid' : 'invalid');
    setErrorMessage(result.message);
  }, [value, type]);

  const validateEmail = (email: string): { valid: boolean; message: string } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Formato de email inválido' };
    }
    
    // Validaciones adicionales
    const [localPart, domain] = email.split('@');
    
    if (localPart.length > 64) {
      return { valid: false, message: 'La parte local del email es demasiado larga' };
    }
    
    if (domain.length > 255) {
      return { valid: false, message: 'El dominio del email es demasiado largo' };
    }
    
    // Validar caracteres especiales
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return { valid: false, message: 'El email no puede comenzar o terminar con punto' };
    }
    
    if (localPart.includes('..')) {
      return { valid: false, message: 'El email no puede contener puntos consecutivos' };
    }
    
    return { valid: true, message: 'Email válido' };
  };

  const validatePhone = (phone: string): { valid: boolean; message: string } => {
    // Eliminar espacios, guiones y paréntesis
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Validar formato mexicano: +52 seguido de 10 dígitos
    const mexicanPhoneRegex = /^\+52\d{10}$/;
    
    if (!mexicanPhoneRegex.test(cleanPhone)) {
      return { 
        valid: false, 
        message: 'Formato: +52 seguido de 10 dígitos (ej: +5212345678901)' 
      };
    }
    
    // Validar que no todos los dígitos sean iguales
    const digits = cleanPhone.slice(3); // Remover +52
    if (/^(\d)\1{9}$/.test(digits)) {
      return { valid: false, message: 'Número de teléfono inválido' };
    }
    
    return { valid: true, message: 'Teléfono válido' };
  };

  const validateText = (text: string): { valid: boolean; message: string } => {
    if (text.trim().length === 0) {
      return { valid: false, message: 'El campo no puede estar vacío' };
    }
    
    if (text.length < 2) {
      return { valid: false, message: 'Debe contener al menos 2 caracteres' };
    }
    
    if (text.length > 255) {
      return { valid: false, message: 'Máximo 255 caracteres' };
    }
    
    return { valid: true, message: 'Válido' };
  };

  const getIcon = () => {
    switch (validationState) {
      case 'valid':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'invalid':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'idle':
        return required ? <AlertCircle className="h-5 w-5 text-gray-400" /> : null;
    }
  };

  const getInputClassName = () => {
    const baseClasses = 'pr-10';
    
    switch (validationState) {
      case 'valid':
        return cn(baseClasses, 'border-green-600 focus-visible:ring-green-600');
      case 'invalid':
        return cn(baseClasses, 'border-red-600 focus-visible:ring-red-600');
      default:
        return baseClasses;
    }
  };

  const getHelperText = () => {
    if (validationState === 'invalid') {
      return errorMessage;
    }
    
    if (validationState === 'idle' && type === 'email') {
      return 'Formato: usuario@dominio.com';
    }
    
    if (validationState === 'idle' && type === 'phone') {
      return 'Formato: +52 seguido de 10 dígitos';
    }
    
    return '';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s/g, '-')}>
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={label.toLowerCase().replace(/\s/g, '-')}
          type={type === 'phone' ? 'tel' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={getInputClassName()}
          disabled={disabled}
          required={required}
        />
        
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getIcon()}
          </div>
        )}
      </div>
      
      {getHelperText() && (
        <p className={cn(
          'text-sm',
          validationState === 'invalid' ? 'text-red-600' : 'text-gray-500'
        )}>
          {getHelperText()}
        </p>
      )}
    </div>
  );
}
