import { useAuth } from "@/_core/hooks/useAuth";
import { ActaConstitutiva } from "@/components/formats/ActaConstitutiva";

export default function DocumentActaConstitutiva() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Acta Constitutiva del Comité
        </h1>
        <p className="text-muted-foreground mt-2">
          Documento formal de constitución del Comité de Atención a Factores de
          Riesgo Psicosocial
        </p>
      </div>

      {/* Form Component */}
      <ActaConstitutiva />
    </div>
  );
}
