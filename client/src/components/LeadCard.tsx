import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, DollarSign, Mail, Phone, Edit, UserCog } from "lucide-react";

interface LeadCardProps {
  lead: any;
  onEdit: (lead: any) => void;
  onReassign?: (lead: any) => void;
  isDragging?: boolean;
}

export function LeadCard({
  lead,
  onEdit,
  onReassign,
  isDragging = false,
}: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={`cursor-move hover:shadow-md transition-shadow ${isDragging ? "shadow-lg" : ""}`}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm line-clamp-1">
                {lead.nombre}
              </h3>
              {lead.empresa && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Building className="w-3 h-3" />
                  <span className="line-clamp-1">{lead.empresa}</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={e => {
                e.stopPropagation();
                onEdit(lead);
              }}
            >
              <Edit className="w-3 h-3" />
            </Button>
          </div>

          {/* Normativas */}
          {lead.normativas && lead.normativas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.normativas.map((normativa: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {normativa}
                </Badge>
              ))}
            </div>
          )}

          {/* Contacto */}
          <div className="space-y-1">
            {lead.email && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="line-clamp-1">{lead.email}</span>
              </div>
            )}
            {lead.telefono && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span>{lead.telefono}</span>
              </div>
            )}
          </div>

          {/* Valor Estimado */}
          {lead.valorEstimado && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1 text-xs font-medium">
                <DollarSign className="w-3 h-3" />
                <span>${Number(lead.valorEstimado).toLocaleString()}</span>
              </div>
              {lead.probabilidadCierre !== null &&
                lead.probabilidadCierre !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {lead.probabilidadCierre}% prob.
                  </Badge>
                )}
            </div>
          )}

          {/* Asignado a */}
          {lead.asignadoNombre && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                Asignado: {lead.asignadoNombre}
              </div>
              {onReassign && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={e => {
                    e.stopPropagation();
                    onReassign(lead);
                  }}
                >
                  <UserCog className="w-3 h-3 mr-1" />
                  Reasignar
                </Button>
              )}
            </div>
          )}

          {/* Origen */}
          {lead.origen && (
            <div className="text-xs text-muted-foreground">
              Origen: {lead.origen}
            </div>
          )}

          {/* Fecha de creación */}
          <div className="text-xs text-muted-foreground">
            Creado: {new Date(lead.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
