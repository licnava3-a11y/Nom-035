/**
 * Helpers para Toasts con Sonner
 * Proporciona funciones estandarizadas para mostrar notificaciones
 */

import { toast } from 'sonner';

interface ToastAction {
  label: string;
  onClick: () => void;
}

/**
 * Muestra un toast de éxito
 */
export function showSuccessToast(
  title: string,
  description?: string,
  action?: ToastAction
) {
  toast.success(title, {
    description,
    duration: 4000,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined
  });
}

/**
 * Muestra un toast de error
 */
export function showErrorToast(
  title: string,
  description?: string,
  action?: ToastAction
) {
  toast.error(title, {
    description,
    duration: 5000, // Errores se muestran más tiempo
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined
  });
}

/**
 * Muestra un toast de advertencia
 */
export function showWarningToast(
  title: string,
  description?: string,
  action?: ToastAction
) {
  toast.warning(title, {
    description,
    duration: 4500,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined
  });
}

/**
 * Muestra un toast informativo
 */
export function showInfoToast(
  title: string,
  description?: string,
  action?: ToastAction
) {
  toast.info(title, {
    description,
    duration: 4000,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined
  });
}

/**
 * Muestra un toast de carga (promise)
 * Útil para operaciones asíncronas
 */
export function showLoadingToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
    duration: 4000
  });
}

/**
 * Toast personalizado con componente React
 */
export function showCustomToast(
  component: React.ReactNode,
  options?: {
    duration?: number;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  }
) {
  toast.custom(() => component as React.ReactElement, {
    duration: options?.duration || 4000,
    position: options?.position
  });
}

/**
 * Cierra todos los toasts activos
 */
export function dismissAllToasts() {
  toast.dismiss();
}

/**
 * Cierra un toast específico por ID
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}
