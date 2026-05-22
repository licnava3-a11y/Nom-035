import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * Hook de autenticación con manejo robusto de cold start en Cloud Run.
 *
 * Estrategia:
 * 1. Intentar auth.me con retry=3 y retryDelay incremental.
 * 2. Si el servidor tarda más de 10s, mostrar skeleton con botón "Reintentar" (no redirigir).
 * 3. Solo redirigir al login cuando auth.me responde explícitamente con 401/UNAUTHORIZED.
 * 4. Nunca redirigir por timeout — el usuario puede estar autenticado en un servidor lento.
 */
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // Contador de reintentos manuales
  const [retryCount, setRetryCount] = useState(0);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 3,                     // 3 reintentos automáticos en caso de fallo de red
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), // backoff: 1s, 2s, 4s
    refetchOnWindowFocus: false,
    staleTime: 60_000,            // fresco por 60s
    // Forzar re-fetch cuando el usuario hace clic en "Reintentar"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // Refetch cuando el usuario hace clic en "Reintentar"
  useEffect(() => {
    if (retryCount > 0) {
      meQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );

    // Determinar si es un error de autenticación explícito (401) vs timeout/red
    const isAuthError =
      meQuery.error instanceof TRPCClientError &&
      (meQuery.error.data?.code === "UNAUTHORIZED" ||
        meQuery.error.data?.httpStatus === 401);

    // Solo consideramos "no autenticado" si:
    // a) La query terminó exitosamente y no hay usuario (meQuery.data === null)
    // b) Hay un error explícito de autenticación (401)
    // NO consideramos timeout como "no autenticado"
    const isLoading = meQuery.isLoading || logoutMutation.isPending;
    const isAuthenticated = Boolean(meQuery.data);
    const isUnauthenticated = !isLoading && (isAuthError || meQuery.data === null);

    return {
      user: meQuery.data ?? null,
      loading: isLoading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated,
      isUnauthenticated,
      isNetworkError: meQuery.error && !isAuthError,
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  // Solo redirigir cuando hay un error explícito de autenticación (401)
  // NUNCA redirigir por timeout o error de red — el servidor puede estar iniciando
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (!state.isUnauthenticated) return; // No redirigir si es error de red/timeout
    if (typeof window === "undefined") return;

    // Prevenir ciclos: verificar si ya estamos en una URL de login/callback
    const currentPath = window.location.pathname;
    if (currentPath.includes("/oauth/") || currentPath.includes("/login")) {
      return;
    }

    try {
      const redirectUrl = new URL(redirectPath, window.location.origin);
      if (window.location.pathname === redirectUrl.pathname) return;
    } catch {
      if (window.location.pathname === redirectPath) return;
    }

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
    state.isUnauthenticated,
  ]);

  return {
    ...state,
    refresh: () => {
      setRetryCount((c) => c + 1);
    },
    logout,
  };
}
