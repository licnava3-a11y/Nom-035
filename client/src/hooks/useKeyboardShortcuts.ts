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
        const ctrlMatch =
          shortcut.ctrl === undefined ||
          shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const shiftMatch =
          shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatch =
          shortcut.alt === undefined || shortcut.alt === event.altKey;
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
// DEPRECATED: Use useGlobalShortcutsHelp from KeyboardShortcutsHelp component instead
export function useShortcutsHelp() {
  // This hook is kept for backward compatibility but does nothing
  // The actual shortcuts help is now handled by KeyboardShortcutsHelp component
}
