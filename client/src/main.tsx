import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import "./i18n/config";
import { NotificationProvider } from "./contexts/NotificationContext";
import { CSRFProvider } from "./contexts/CSRFContext";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - datos considerados frescos
      gcTime: 10 * 60 * 1000, // 10 minutos - mantener en cache (antes cacheTime)
      refetchOnWindowFocus: false, // No refetch al cambiar de ventana
      retry: 1, // Solo 1 reintento en caso de error
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

// Variable para almacenar función de renovación de token CSRF
let renewCSRFToken: (() => Promise<void>) | null = null;

export function setCSRFRenewalFunction(renewFn: () => Promise<void>) {
  renewCSRFToken = renewFn;
}

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    
    // Manejar errores 403 Forbidden (CSRF token inválido/expirado)
    if (error instanceof TRPCClientError && error.data?.code === "FORBIDDEN") {
      const message = error.message;
      
      // Si es error de CSRF, intentar renovar token
      if (message.includes("CSRF") || message.includes("Token CSRF")) {
        console.warn("[CSRF Error] Token inválido o expirado, renovando...");
        
        if (renewCSRFToken) {
          renewCSRFToken().then(() => {
            console.log("[CSRF] Token renovado exitosamente");
            // Mostrar mensaje al usuario
            alert("Tu sesión ha expirado. Por favor, intenta nuevamente.");
          }).catch((err) => {
            console.error("[CSRF] Error al renovar token:", err);
            alert("Error de seguridad. Por favor, recarga la página.");
          });
        }
      }
    }
    
    console.error("[API Mutation Error]", error);
  }
});

// Variable global para almacenar el token CSRF
let csrfToken: string | undefined;

// Función para actualizar el token CSRF desde el CSRFProvider
export function setGlobalCSRFToken(token: string | undefined) {
  csrfToken = token;
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        // Agregar token CSRF en headers para mutations
        const headers = new Headers(init?.headers);
        if (csrfToken) {
          headers.set("x-csrf-token", csrfToken);
        }
        
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});

// Guardar referencia al root para evitar múltiples createRoot() con HMR
let root = (globalThis as any).__react_root;
if (!root) {
  root = createRoot(document.getElementById("root")!);
  (globalThis as any).__react_root = root;
}

// Inicializar métricas Core Web Vitals (carga lazy para no bloquear el render)
import("./lib/webVitals").then(({ initWebVitals }) => initWebVitals()).catch(() => {});

// Service Worker: se usa selfDestroying para limpiar SWs anteriores en producción
// El reload automático en controllerchange causaba loops de recarga en iOS Safari
if ("serviceWorker" in navigator) {
  // Desregistrar cualquier SW antiguo al cargar para limpiar cachés obsoletas
  navigator.serviceWorker.getRegistrations().then(registrations => {
    // Solo limpiar si hay más de 1 SW registrado (indica versión obsoleta)
    if (registrations.length > 1) {
      registrations.forEach(r => r.unregister());
    }
  }).catch(() => {});
}

// Ocultar el spinner de carga inicial cuando React monta
function hideAppLoading() {
  const loader = document.getElementById('app-loading');
  if (!loader) return;
  loader.classList.add('fade-out');
  setTimeout(() => {
    if (loader.parentNode) loader.remove();
  }, 350);
}

root.render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
  <QueryClientProvider client={queryClient}>
    <CSRFProvider>
      <NotificationProvider>
        <Toaster position="top-right" richColors closeButton />
        <App />
      </NotificationProvider>
    </CSRFProvider>
  </QueryClientProvider>
  </trpc.Provider>
);

// Ocultar spinner: (1) tras primer frame de React, (2) timeout de seguridad a los 2s
requestAnimationFrame(() => requestAnimationFrame(hideAppLoading));
setTimeout(hideAppLoading, 2000);
