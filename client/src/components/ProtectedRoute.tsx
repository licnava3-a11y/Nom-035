import { ReactNode, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("admin" | "user")[];
  requireAuth?: boolean;
}

/**
 * Componente para proteger rutas según rol del usuario.
 *
 * CORRECCIÓN CICLO INFINITO:
 * El redirect al portal OAuth se hace SOLO en un useEffect (nunca en render),
 * con las mismas guardas anti-ciclo que useAuth y main.tsx:
 *   1. Nunca redirigir si ya estamos en un flujo OAuth (callback, login-error, etc.)
 *   2. Throttle de 3 segundos entre redirects consecutivos (sessionStorage._last_login_redirect)
 *   3. Nunca redirigir si loading=true (servidor puede estar iniciando — cold start Cloud Run)
 *   4. Nunca redirigir si hay error de red/timeout (solo en error 401 explícito)
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, loading, isUnauthenticated } = useAuth();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!requireAuth) return;
    if (loading) return;
    if (user) {
      // Autenticado — limpiar throttle para futuros logouts
      redirectedRef.current = false;
      sessionStorage.removeItem("_last_login_redirect");
      return;
    }
    if (!isUnauthenticated) return; // Error de red/timeout — NO redirigir

    if (typeof window === "undefined") return;

    // Guard 1: no redirigir si ya estamos en un flujo de autenticación
    const currentPath = window.location.pathname;
    const isInAuthFlow =
      currentPath.includes("/oauth/callback") ||
      currentPath.includes("/manus-oauth/") ||
      currentPath === "/login-error" ||
      currentPath === "/login";
    if (isInAuthFlow) return;

    // Guard 2: throttle anti-ciclo — no redirigir si ya redirigimos hace <3s
    const lastRedirect = sessionStorage.getItem("_last_login_redirect");
    const now = Date.now();
    if (lastRedirect && now - parseInt(lastRedirect, 10) < 3000) {
      console.warn("[ProtectedRoute] Redirect throttled — too soon after last redirect");
      return;
    }

    // Guard 3: no redirigir más de una vez por montaje de componente
    if (redirectedRef.current) return;

    redirectedRef.current = true;
    sessionStorage.setItem("_last_login_redirect", String(now));
    console.log("[ProtectedRoute] Redirecting to OAuth login:", currentPath);
    window.location.href = getLoginUrl(currentPath);
  }, [requireAuth, loading, user, isUnauthenticated]);

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si requiere autenticación y no hay usuario, mostrar spinner mientras se redirige
  if (requireAuth && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verificar roles permitidos
  if (allowedRoles && user) {
    const hasPermission = allowedRoles.includes(user.role as "admin" | "user");

    if (!hasPermission) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-destructive mb-4">Acceso Denegado</h1>
            <p className="text-muted-foreground mb-6">
              No tienes permisos para acceder a esta página.
              Esta sección está restringida a: {allowedRoles.join(", ")}.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Volver al Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
