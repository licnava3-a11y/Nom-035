import { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("admin" | "user")[];
  requireAuth?: boolean;
}

/**
 * Componente para proteger rutas según rol del usuario
 * 
 * @param children - Contenido a renderizar si el usuario tiene acceso
 * @param allowedRoles - Array de roles permitidos (admin, user). Si no se especifica, permite todos los roles autenticados
 * @param requireAuth - Si es true, requiere autenticación (por defecto true)
 * 
 * @example
 * // Solo admin puede acceder
 * <ProtectedRoute allowedRoles={["admin"]}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * 
 * @example
 * // Admin e instructor pueden acceder
 * <ProtectedRoute allowedRoles={["admin", "user"]}>
 *   <CoursesPage />
 * </ProtectedRoute>
 * 
 * @example
 * // Cualquier usuario autenticado puede acceder
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si requiere autenticación y no hay usuario, redirigir al portal OAuth
  if (requireAuth && !user) {
    // Use window.location.href to navigate to the external OAuth portal
    // (Redirect component only handles internal wouter routes)
    if (typeof window !== "undefined") {
      window.location.href = getLoginUrl(window.location.pathname);
    }
    return null;
  }

  // Si se especificaron roles permitidos, verificar que el usuario tenga uno de ellos
  if (allowedRoles && user) {
    const hasPermission = allowedRoles.includes(user.role as "admin" | "user");
    
    if (!hasPermission) {
      // Redirigir a página de acceso denegado o dashboard según el rol
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

  // Usuario tiene acceso, renderizar contenido
  return <>{children}</>;
}
