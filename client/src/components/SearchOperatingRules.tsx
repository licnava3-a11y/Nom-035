import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SearchOperatingRulesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResult: (ruleId: number) => void;
}

export function SearchOperatingRules({ open, onOpenChange, onSelectResult }: SearchOperatingRulesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading } = trpc.committeeOperatingRules.searchOperatingRules.useQuery(
    {
      query: debouncedQuery,
      limit: 20,
      offset: 0,
    },
    {
      enabled: debouncedQuery.length >= 2, // Solo buscar si hay al menos 2 caracteres
    }
  );

  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleSelectResult = (ruleId: number) => {
    onSelectResult(ruleId);
    onOpenChange(false);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Bases de Funcionamiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por título, objetivos, estructura, roles o miembros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Resultados */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {isLoading && debouncedQuery.length >= 2 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Buscando...</span>
              </div>
            )}

            {!isLoading && debouncedQuery.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Ingresa al menos 2 caracteres para buscar</p>
              </div>
            )}

            {!isLoading && debouncedQuery.length >= 2 && searchResults && searchResults.results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron resultados para "{debouncedQuery}"</p>
                <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
              </div>
            )}

            {!isLoading && searchResults && searchResults.results.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">
                    {searchResults.total} resultado{searchResults.total !== 1 ? "s" : ""} encontrado{searchResults.total !== 1 ? "s" : ""}
                  </p>
                </div>

                {searchResults.results.map((result) => (
                  <Card
                    key={result.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSelectResult(result.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {/* Header con título y badges */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {highlightText(result.title || "Sin título", debouncedQuery)}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">V{result.version}</Badge>
                            <Badge
                              variant={result.status === "active" ? "default" : "secondary"}
                            >
                              {result.status === "active" ? "Activa" : "Borrador"}
                            </Badge>
                          </div>
                        </div>

                        {/* Snippet de contexto */}
                        {result.snippet && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {highlightText(result.snippet, debouncedQuery)}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Actualizada: {format(new Date(result.updatedAt), "PPP", { locale: es })}
                          </span>
                        </div>

                        {/* Botón de acción */}
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectResult(result.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
