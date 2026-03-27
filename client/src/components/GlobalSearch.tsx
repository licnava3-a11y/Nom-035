import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ICONS } from "@/lib/iconography";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  // Query para buscar bases de funcionamiento
  const { data: searchData, isLoading } = trpc.committeeOperatingRules.searchOperatingRules.useQuery(
    { query },
    { enabled: open && query.length >= 2 }
  );
  const results = searchData?.results;

  // Limpiar query cuando se cierra el diálogo
  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleSelectResult = (ruleId: number) => {
    setLocation(`/committee-operating-rules?edit=${ruleId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ICONS.actions.search className="h-5 w-5" />
            Búsqueda Global
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <ICONS.actions.search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar bases de funcionamiento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-4">
          {query.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <ICONS.actions.search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Escribe al menos 2 caracteres para buscar</p>
            </div>
          )}

          {query.length >= 2 && isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <ICONS.status.loading className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Buscando...</p>
            </div>
          )}

          {query.length >= 2 && !isLoading && searchData && results && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ICONS.status.alert className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No se encontraron resultados para "{query}"</p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result: any) => (
                <Card
                  key={result.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleSelectResult(result.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 truncate">
                          {result.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {result.description || "Sin descripción"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={result.status === "active" ? "default" : "secondary"} className="text-xs">
                            {result.status === "active" ? "Activo" : "Borrador"}
                          </Badge>
                          {result.version && (
                            <span className="text-xs text-muted-foreground">
                              v{result.version}
                            </span>
                          )}
                        </div>
                      </div>
                      <ICONS.navigation.forward className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <ICONS.status.info className="h-3 w-3" />
            <span>
              Presiona <Badge variant="outline" className="font-mono text-xs mx-1">Ctrl</Badge> + 
              <Badge variant="outline" className="font-mono text-xs mx-1">K</Badge> para abrir la búsqueda
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook para manejar el atajo global de búsqueda (Ctrl+K)
 */
export function useGlobalSearch() {
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setShowSearch(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { showSearch, setShowSearch };
}
