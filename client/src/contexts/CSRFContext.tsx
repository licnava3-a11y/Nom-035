/**
 * CSRFContext
 * Provee tokens CSRF a toda la aplicación mediante Context API
 * Permite acceso global al token sin prop drilling
 */

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useCSRFToken } from "@/hooks/useCSRFToken";
import { setGlobalCSRFToken, setCSRFRenewalFunction } from "@/main";

interface CSRFContextValue {
  token: string | undefined;
  headerName: string;
  isLoading: boolean;
  error: string | null;
  renewToken: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextValue | undefined>(undefined);

export function CSRFProvider({ children }: { children: ReactNode }) {
  const csrfData = useCSRFToken();

  // Sincronizar token con la variable global en main.tsx
  useEffect(() => {
    setGlobalCSRFToken(csrfData.token);
  }, [csrfData.token]);

  // Registrar función de renovación para manejo de errores 403
  useEffect(() => {
    setCSRFRenewalFunction(csrfData.renewToken);
  }, [csrfData.renewToken]);

  return (
    <CSRFContext.Provider value={csrfData}>{children}</CSRFContext.Provider>
  );
}

/**
 * Hook para acceder al token CSRF desde cualquier componente
 */
export function useCSRF() {
  const context = useContext(CSRFContext);
  if (context === undefined) {
    throw new Error("useCSRF must be used within a CSRFProvider");
  }
  return context;
}
