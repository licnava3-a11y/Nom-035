import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ICONS } from "@/lib/iconography";

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: KeyboardShortcut[] = [
  // Navegación
  {
    keys: ["Ctrl", "K"],
    description: "Búsqueda global de documentos",
    category: "Navegación"
  },
  {
    keys: ["Ctrl", "/"],
    description: "Mostrar/ocultar esta ayuda",
    category: "Navegación"
  },
  
  // Acciones
  {
    keys: ["Ctrl", "S"],
    description: "Guardar cambios",
    category: "Acciones"
  },
  {
    keys: ["Ctrl", "N"],
    description: "Crear nuevo documento",
    category: "Acciones"
  },
  {
    keys: ["Ctrl", "E"],
    description: "Editar documento actual",
    category: "Acciones"
  },
  {
    keys: ["Delete"],
    description: "Eliminar elemento seleccionado",
    category: "Acciones"
  },
  
  // Diálogos
  {
    keys: ["Esc"],
    description: "Cerrar diálogo o cancelar edición",
    category: "Diálogos"
  },
  {
    keys: ["Enter"],
    description: "Confirmar acción en diálogo",
    category: "Diálogos"
  },
  
  // Formularios
  {
    keys: ["Tab"],
    description: "Navegar al siguiente campo",
    category: "Formularios"
  },
  {
    keys: ["Shift", "Tab"],
    description: "Navegar al campo anterior",
    category: "Formularios"
  }
];

const CATEGORIES = ["Navegación", "Acciones", "Diálogos", "Formularios"];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ICONS.status.help className="h-5 w-5" />
            Atajos de Teclado
          </DialogTitle>
          <DialogDescription>
            Usa estos atajos para navegar y trabajar más rápido en el sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {CATEGORIES.map((category) => {
            const categoryShortcuts = SHORTCUTS.filter(s => s.category === category);
            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <Card key={index} className="border-border/50">
                      <CardContent className="p-3 flex items-center justify-between">
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <span key={keyIndex} className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs px-2 py-1"
                              >
                                {key}
                              </Badge>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="text-muted-foreground text-xs">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <ICONS.status.info className="h-4 w-4 inline mr-2" />
            <strong>Tip:</strong> Presiona <Badge variant="outline" className="font-mono text-xs mx-1">Ctrl</Badge> + 
            <Badge variant="outline" className="font-mono text-xs mx-1">/</Badge> en cualquier momento para ver esta ayuda
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook para manejar el atajo global de ayuda (Ctrl+/)
 */
export function useGlobalShortcutsHelp() {
  const [showHelp, setShowHelp] = useState(false);

  // Registrar atajo global Ctrl+/
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        setShowHelp(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { showHelp, setShowHelp };
}
