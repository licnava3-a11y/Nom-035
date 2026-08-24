/**
 * Hook useCSRFToken
 * Gestiona la obtención y renovación automática de tokens CSRF
 * para protección contra ataques Cross-Site Request Forgery
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

interface CSRFTokenData {
  token: string;
  headerName: string;
}

export function useCSRFToken() {
  const [csrfData, setCSRFData] = useState<CSRFTokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener token CSRF del servidor
  const {
    data,
    isLoading: queryLoading,
    error: queryError,
    refetch,
  } = trpc.auth.getCSRFToken.useQuery(undefined, {
    // Renovar token cada 50 minutos (antes de que expire en 1 hora)
    refetchInterval: 50 * 60 * 1000,
    // No refetch automático en focus/mount para evitar requests innecesarios
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (data) {
      setCSRFData(data);
      setIsLoading(false);
      setError(null);
    }
  }, [data]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
      setIsLoading(false);
    }
  }, [queryError]);

  useEffect(() => {
    setIsLoading(queryLoading);
  }, [queryLoading]);

  /**
   * Renovar token manualmente (útil después de errores 403)
   */
  const renewToken = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await refetch();
      if (result.data) {
        setCSRFData(result.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al renovar token CSRF"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    token: csrfData?.token,
    headerName: csrfData?.headerName || "x-csrf-token",
    isLoading,
    error,
    renewToken,
  };
}
