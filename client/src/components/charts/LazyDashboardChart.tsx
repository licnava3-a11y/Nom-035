import { type ComponentType, useEffect, useState } from "react";
import { DeferredChartFrame } from "./DeferredChartFrame";

type ChartKind = "line" | "bar" | "doughnut";
type ChartProps = { data: unknown; options?: unknown };

/** Carga Chart.js y react-chartjs-2 solo cuando una visualización llega a montarse. */
export function LazyDashboardChart({
  kind,
  data,
  options,
}: ChartProps & { kind: ChartKind }) {
  const [Renderer, setRenderer] = useState<ComponentType<ChartProps> | null>(
    null
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [chartJs, reactCharts] = await Promise.all([
        import("chart.js"),
        import("react-chartjs-2"),
      ]);
      chartJs.Chart.register(
        chartJs.CategoryScale,
        chartJs.LinearScale,
        chartJs.PointElement,
        chartJs.LineElement,
        chartJs.BarElement,
        chartJs.Title,
        chartJs.Tooltip,
        chartJs.Legend,
        chartJs.ArcElement
      );
      const component =
        kind === "line"
          ? reactCharts.Line
          : kind === "bar"
            ? reactCharts.Bar
            : reactCharts.Doughnut;
      if (active) setRenderer(() => component as ComponentType<ChartProps>);
    };
    void load();
    return () => {
      active = false;
    };
  }, [kind]);

  return (
    <DeferredChartFrame
      loading={!Renderer}
      type={kind === "doughnut" ? "doughnut" : kind}
      heightClass="h-[300px]"
    >
      {Renderer ? (
        <Renderer data={data} options={options} />
      ) : (
        <div className="h-[300px]" />
      )}
    </DeferredChartFrame>
  );
}
