import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // Timeout de seguridad: si auth.me no responde en 8s (cold start de Cloud Run),
  // dejamos de mostrar el skeleton y tratamos al usuario como no autenticado.
  const [authTimedOut, setAuthTimedOut] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Iniciar el timer solo mientras la query esté cargando
  useEffect(() => {
    if (!meQuery.isLoading) {
      setAuthTimedOut(false); // resetear si la query termina
      return;
    }
    const t = setTimeout(() => {
      console.warn("[useAuth] auth.me timeout after 8s — treating as unauthenticated");
      setAuthTimedOut(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [meQuery.isLoading]);

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
    // Si el timeout se disparó, ya no estamos "loading" — mostramos el estado de no autenticado
    const isLoading = authTimedOut ? false : (meQuery.isLoading || logoutMutation.isPending);
    return {
      user: meQuery.data ?? null,
      loading: isLoading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    authTimedOut,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    
    // Prevenir ciclos infinitos: verificar si ya estamos en una URL de login/callback
    const currentPath = window.location.pathname;
    if (currentPath.includes("/oauth/") || currentPath.includes("/login")) {
      console.log("[useAuth] Already in auth flow, skipping redirect");
      return;
    }
    
    // Verificar si la URL de redirección es la misma que la actual
    try {
      const redirectUrl = new URL(redirectPath, window.location.origin);
      if (window.location.pathname === redirectUrl.pathname) {
        console.log("[useAuth] Already at redirect path, skipping redirect");
        return;
      }
    } catch (e) {
      // Si redirectPath no es una URL válida, comparar directamente
      if (window.location.pathname === redirectPath) {
        console.log("[useAuth] Already at redirect path, skipping redirect");
        return;
      }
    }

    console.log("[useAuth] Redirecting to:", redirectPath);
    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
