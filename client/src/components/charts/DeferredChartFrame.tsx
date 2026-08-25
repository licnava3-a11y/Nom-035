import { type ReactNode } from "react";
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";

type DeferredChartFrameProps = {
  loading: boolean;
  type?: "line" | "bar" | "pie" | "doughnut";
  heightClass?: string;
  children: ReactNode;
};

/** Mantiene el canvas montado mientras se descarga Chart.js y evita saltos visuales. */
export function DeferredChartFrame({
  loading,
  type = "bar",
  heightClass = "h-64",
  children,
}: DeferredChartFrameProps) {
  return (
    <section aria-busy={loading} aria-live="polite" className="relative">
      {loading && (
        <div
          role="status"
          aria-label="Cargando gráfica"
          className="absolute inset-0 z-10"
        >
          <ChartSkeleton type={type} height={heightClass} title={false} />
        </div>
      )}
      <div className={loading ? "invisible" : "visible"}>{children}</div>
    </section>
  );
}
