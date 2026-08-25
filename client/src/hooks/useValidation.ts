import { useState, useCallback } from "react";
import {
  validateCURP,
  validateRFC,
  validateNSS,
  validateEmail,
} from "../../../shared/validators";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ValidationState {
  curp: ValidationResult | null;
  rfc: ValidationResult | null;
  nss: ValidationResult | null;
  email: ValidationResult | null;
}

export function useValidation() {
  const [validations, setValidations] = useState<ValidationState>({
    curp: null,
    rfc: null,
    nss: null,
    email: null,
  });

  const validateCURPField = useCallback((curp: string) => {
    if (!curp || curp.length === 0) {
      setValidations(prev => ({ ...prev, curp: null }));
      return null;
    }

    const result = validateCURP(curp);
    setValidations(prev => ({ ...prev, curp: result }));
    return result;
  }, []);

  const validateRFCField = useCallback(
    (rfc: string, tipoPersona: "fisica" | "moral" = "fisica") => {
      if (!rfc || rfc.length === 0) {
        setValidations(prev => ({ ...prev, rfc: null }));
        return null;
      }

      const result = validateRFC(rfc, tipoPersona);
      setValidations(prev => ({ ...prev, rfc: result }));
      return result;
    },
    []
  );

  const validateNSSField = useCallback((nss: string) => {
    if (!nss || nss.length === 0) {
      setValidations(prev => ({ ...prev, nss: null }));
      return null;
    }

    const result = validateNSS(nss);
    setValidations(prev => ({ ...prev, nss: result }));
    return result;
  }, []);

  const validateEmailField = useCallback((email: string) => {
    if (!email || email.length === 0) {
      setValidations(prev => ({ ...prev, email: null }));
      return null;
    }

    const result = validateEmail(email);
    setValidations(prev => ({ ...prev, email: result }));
    return result;
  }, []);

  const clearValidation = useCallback((field: keyof ValidationState) => {
    setValidations(prev => ({ ...prev, [field]: null }));
  }, []);

  const clearAllValidations = useCallback(() => {
    setValidations({
      curp: null,
      rfc: null,
      nss: null,
      email: null,
    });
  }, []);

  return {
    validations,
    validateCURPField,
    validateRFCField,
    validateNSSField,
    validateEmailField,
    clearValidation,
    clearAllValidations,
  };
}
