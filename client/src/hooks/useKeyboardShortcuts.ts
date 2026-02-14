import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const shiftMatch = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatch = shortcut.alt === undefined || shortcut.alt === event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Hook para mostrar ayuda de atajos de teclado
export function useShortcutsHelp() {
  useEffect(() => {
    const handleHelp = (event: KeyboardEvent) => {
      // Ctrl+/ o Cmd+/ muestra ayuda
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        console.log("Atajos de teclado disponibles:");
        console.log("Ctrl+S: Guardar");
        console.log("Ctrl+K: Búsqueda rápida");
        console.log("Escape: Cerrar diálogos");
        console.log("Ctrl+/: Mostrar esta ayuda");
      }
    };

    window.addEventListener("keydown", handleHelp);
    return () => window.removeEventListener("keydown", handleHelp);
  }, []);
}
