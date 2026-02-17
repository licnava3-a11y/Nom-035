import { useState, useCallback } from "react";

export interface ValidationResult {
  isValid: boolean;
  message: string;
  type: "success" | "error" | "idle";
}

export interface ValidationRules {
  required?: boolean;
  email?: boolean;
  phone?: boolean;
  curp?: boolean;
  minLength?: number;
  maxLength?: number;
  custom?: (value: string) => ValidationResult;
}

/**
 * Hook para validación en tiempo real de campos de formulario
 * Soporta validación de email, teléfono, CURP y reglas personalizadas
 */
export function useRealtimeValidation() {
  const [validationState, setValidationState] = useState<Record<string, ValidationResult>>({});

  /**
   * Valida formato de email según RFC 5322 (simplificado)
   */
  const validateEmail = useCallback((email: string): ValidationResult => {
    if (!email) {
      return { isValid: false, message: "", type: "idle" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    return {
      isValid,
      message: isValid ? "Email válido" : "Formato de email inválido",
      type: isValid ? "success" : "error",
    };
  }, []);

  /**
   * Valida formato de teléfono (mexicano e internacional)
   * Acepta: +52 1234567890, 1234567890, (123) 456-7890
   */
  const validatePhone = useCallback((phone: string): ValidationResult => {
    if (!phone) {
      return { isValid: false, message: "", type: "idle" };
    }

    // Remover espacios, guiones y paréntesis
    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    
    // Validar formato: debe tener 10 dígitos o 12-13 con código de país
    const phoneRegex = /^(\+?52)?[0-9]{10}$/;
    const isValid = phoneRegex.test(cleanPhone);

    return {
      isValid,
      message: isValid ? "Teléfono válido" : "Formato de teléfono inválido (10 dígitos)",
      type: isValid ? "success" : "error",
    };
  }, []);

  /**
   * Valida formato de CURP (18 caracteres)
   * Formato: 4 letras + 6 dígitos (fecha) + 1 letra + 5 alfanuméricos + 2 dígitos
   */
  const validateCURP = useCallback((curp: string): ValidationResult => {
    if (!curp) {
      return { isValid: false, message: "", type: "idle" };
    }

    const curpUpper = curp.toUpperCase();
    
    // Validar longitud
    if (curpUpper.length !== 18) {
      return {
        isValid: false,
        message: `CURP debe tener 18 caracteres (actual: ${curpUpper.length})`,
        type: "error",
      };
    }

    // Validar formato completo
    const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/;
    const isValid = curpRegex.test(curpUpper);

    if (!isValid) {
      return {
        isValid: false,
        message: "Formato de CURP inválido",
        type: "error",
      };
    }

    // Validar fecha de nacimiento (posiciones 4-9: AAMMDD)
    const year = parseInt(curpUpper.substring(4, 6));
    const month = parseInt(curpUpper.substring(6, 8));
    const day = parseInt(curpUpper.substring(8, 10));

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return {
        isValid: false,
        message: "Fecha de nacimiento en CURP inválida",
        type: "error",
      };
    }

    return {
      isValid: true,
      message: "CURP válido",
      type: "success",
    };
  }, []);

  /**
   * Valida un campo según las reglas especificadas
   */
  const validate = useCallback(
    (fieldName: string, value: string, rules: ValidationRules): ValidationResult => {
      // Campo vacío
      if (!value || value.trim() === "") {
        if (rules.required) {
          return { isValid: false, message: "Este campo es requerido", type: "error" };
        }
        return { isValid: true, message: "", type: "idle" };
      }

      // Validación de longitud mínima
      if (rules.minLength && value.length < rules.minLength) {
        return {
          isValid: false,
          message: `Mínimo ${rules.minLength} caracteres`,
          type: "error",
        };
      }

      // Validación de longitud máxima
      if (rules.maxLength && value.length > rules.maxLength) {
        return {
          isValid: false,
          message: `Máximo ${rules.maxLength} caracteres`,
          type: "error",
        };
      }

      // Validación de email
      if (rules.email) {
        return validateEmail(value);
      }

      // Validación de teléfono
      if (rules.phone) {
        return validatePhone(value);
      }

      // Validación de CURP
      if (rules.curp) {
        return validateCURP(value);
      }

      // Validación personalizada
      if (rules.custom) {
        return rules.custom(value);
      }

      return { isValid: true, message: "", type: "success" };
    },
    [validateEmail, validatePhone, validateCURP]
  );

  /**
   * Valida un campo y actualiza el estado
   */
  const validateField = useCallback(
    (fieldName: string, value: string, rules: ValidationRules) => {
      const result = validate(fieldName, value, rules);
      setValidationState((prev) => ({
        ...prev,
        [fieldName]: result,
      }));
      return result;
    },
    [validate]
  );

  /**
   * Limpia la validación de un campo
   */
  const clearValidation = useCallback((fieldName: string) => {
    setValidationState((prev) => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
  }, []);

  /**
   * Limpia todas las validaciones
   */
  const clearAllValidations = useCallback(() => {
    setValidationState({});
  }, []);

  /**
   * Obtiene el estado de validación de un campo
   */
  const getValidation = useCallback(
    (fieldName: string): ValidationResult => {
      return validationState[fieldName] || { isValid: true, message: "", type: "idle" };
    },
    [validationState]
  );

  /**
   * Verifica si todos los campos son válidos
   */
  const isAllValid = useCallback((): boolean => {
    return Object.values(validationState).every((v) => v.isValid);
  }, [validationState]);

  return {
    validateField,
    clearValidation,
    clearAllValidations,
    getValidation,
    isAllValid,
    validationState,
  };
}
