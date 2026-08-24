import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("gráficos diferidos", () => {
  it("carga Chart.js mediante importación dinámica y conserva un esqueleto accesible", () => {
    const bar = readFileSync(
      resolve(
        process.cwd(),
        "client/src/components/job-positions/EmployeesBarChart.tsx"
      ),
      "utf8"
    );
    const line = readFileSync(
      resolve(
        process.cwd(),
        "client/src/components/job-positions/HistoryTrendChart.tsx"
      ),
      "utf8"
    );
    const dashboard = readFileSync(
      resolve(
        process.cwd(),
        "client/src/components/charts/LazyDashboardChart.tsx"
      ),
      "utf8"
    );
    const frame = readFileSync(
      resolve(
        process.cwd(),
        "client/src/components/charts/DeferredChartFrame.tsx"
      ),
      "utf8"
    );
    expect(bar).toContain('import("chart.js/auto")');
    expect(line).toContain('import("chart.js/auto")');
    expect(dashboard).toContain('import("chart.js")');
    expect(dashboard).toContain('import("react-chartjs-2")');
    expect(frame).toContain("aria-busy");
    expect(frame).toContain("ChartSkeleton");
  });
});
