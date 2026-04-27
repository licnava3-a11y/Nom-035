/**
 * PWAUpdateBanner — Sprint 39
 * Muestra un toast no intrusivo cuando hay una nueva versión del Service Worker disponible.
 * Usa useRegisterSW de vite-plugin-pwa para detectar actualizaciones.
 */
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function PWAUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Verificar actualizaciones cada hora
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn("[PWA] Error al registrar Service Worker:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast.info("Nueva versión disponible", {
        description: "Hay una actualización de la plataforma lista para instalar.",
        duration: Infinity,
        id: "pwa-update",
        action: {
          label: "Actualizar ahora",
          onClick: () => {
            updateServiceWorker(true);
            setNeedRefresh(false);
          },
        },
        cancel: {
          label: "Después",
          onClick: () => setNeedRefresh(false),
        },
        icon: <RefreshCw className="h-4 w-4 text-blue-500" />,
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}
