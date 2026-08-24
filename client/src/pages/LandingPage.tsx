import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

/**
 * LandingPage — Página de inicio pública.
 *
 * Estrategia anti-spinner definitiva:
 * 1. Si hay sesión cacheada en localStorage → redirigir al dashboard SIN esperar auth.me.
 *    (El dashboard verificará la sesión real; si expiró, lo redirige al login.)
 * 2. Si auth.me responde antes de 3s y el usuario está autenticado → redirigir al dashboard.
 * 3. Si auth.me responde antes de 3s y no hay sesión → mostrar botón de login.
 * 4. Si auth.me NO responde en 3s (cold start Cloud Run) → mostrar botón de login igualmente.
 *
 * NUNCA mostrar un spinner indefinido. El usuario siempre tiene una acción disponible.
 */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  // Después de 3s, mostrar el botón de login aunque loading siga en true
  const [timedOut, setTimedOut] = useState(false);

  // Redirección instantánea para usuarios recurrentes:
  // Si hay datos de sesión en localStorage (escritos por useAuth), redirigir de inmediato
  // sin esperar a que auth.me responda. El dashboard verificará la sesión real.
  const [redirecting, setRedirecting] = useState(() => {
    try {
      const cached = localStorage.getItem("manus-runtime-user-info");
      if (cached) {
        const parsed = JSON.parse(cached);
        // Solo redirigir si hay un objeto de usuario válido (no null/undefined)
        return (
          parsed !== null &&
          parsed !== undefined &&
          typeof parsed === "object" &&
          parsed.id
        );
      }
    } catch {
      // localStorage no disponible o JSON inválido — ignorar
    }
    return false;
  });

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Redirección instantánea si hay sesión cacheada
  useEffect(() => {
    if (redirecting) {
      navigate("/dashboard");
    }
  }, [redirecting, navigate]);

  // Si el usuario ya está autenticado (confirmado por auth.me), redirigir al dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  // Mostrar spinner SOLO durante los primeros 3s y mientras loading=true
  // (o mientras se está redirigiendo a usuarios autenticados)
  const showSpinner = (loading && !timedOut) || redirecting;

  if (showSpinner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <svg
              viewBox="0 0 24 24"
              className="w-9 h-9 stroke-green-500 fill-none stroke-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2L2 7l10 5 10-5-10-5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2 17l10 5 10-5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2 12l10 5 10-5"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500">Verificando sesión...</p>
          <div className="w-6 h-6 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Usuario no autenticado — mostrar landing con botón de login
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-4xl mx-auto p-8">
        <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
          <svg
            viewBox="0 0 24 24"
            className="w-11 h-11 stroke-green-500 fill-none stroke-2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2L2 7l10 5 10-5-10-5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2 17l10 5 10-5"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2 12l10 5 10-5"
            />
          </svg>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Plataforma NOM-035 STPS 2018
        </h1>

        <p className="text-xl text-slate-600 dark:text-slate-400">
          Gestión Integral de Riesgos Psicosociales
        </p>

        <div className="pt-8">
          <a
            href={getLoginUrl()}
            className="inline-flex items-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg shadow-lg transition-colors"
          >
            Iniciar Sesión
          </a>
        </div>

        <p className="text-sm text-slate-400 pt-4">
          Sistema de gestión de factores de riesgo psicosocial conforme a la
          NOM-035-STPS-2018
        </p>
      </div>
    </div>
  );
}
