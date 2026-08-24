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
    retry: 3, // 3 reintentos automáticos en caso de fallo de red
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000), // backoff: 1s, 2s, 4s
    refetchOnWindowFocus: false,
    staleTime: 60_000, // fresco por 60s
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
    // Solo persistir en localStorage cuando la query terminó (no durante loading)
    // y solo si hay un usuario válido o si la sesión expiró explícitamente (null)
    // NUNCA guardar undefined (estado de carga) para evitar falsos positivos en LandingPage
    if (!meQuery.isLoading) {
      if (meQuery.data) {
        // Sesión activa: guardar datos del usuario
        localStorage.setItem(
          "manus-runtime-user-info",
          JSON.stringify(meQuery.data)
        );
      } else if (meQuery.data === null) {
        // Sesión expirada: limpiar caché para evitar redirección instantánea en LandingPage
        localStorage.removeItem("manus-runtime-user-info");
      }
      // Si hay error de red (undefined), NO tocar localStorage (mantener caché anterior)
    }

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
    const isUnauthenticated =
      !isLoading && (isAuthError || meQuery.data === null);

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
    if (state.user) {
      // User is authenticated — clear the redirect throttle so future logouts work
      sessionStorage.removeItem("_last_login_redirect");
      return;
    }
    if (!state.isUnauthenticated) return; // No redirigir si es error de red/timeout
    if (typeof window === "undefined") return;

    // Anti-loop guard: never redirect if already in an auth flow
    const currentPath = window.location.pathname;
    const isInAuthFlow =
      currentPath.includes("/oauth/callback") ||
      currentPath.includes("/manus-oauth/") ||
      currentPath === "/login-error" ||
      currentPath === "/login";
    if (isInAuthFlow) return;

    // Anti-loop guard: throttle consecutive redirects
    const lastRedirect = sessionStorage.getItem("_last_login_redirect");
    const now = Date.now();
    if (lastRedirect && now - parseInt(lastRedirect, 10) < 3000) {
      console.warn(
        "[useAuth] Redirect throttled — too soon after last redirect"
      );
      return;
    }
    sessionStorage.setItem("_last_login_redirect", String(now));

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
      setRetryCount(c => c + 1);
    },
    logout,
  };
}
