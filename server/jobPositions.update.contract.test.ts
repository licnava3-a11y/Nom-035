import { describe, expect, it } from "vitest";
import { jobPositionUpdateInput } from "./routers";

describe("jobPositions.update input contract", () => {
  it("accepts analysisNotes and valid NOM-035 factors", () => {
    const parsed = jobPositionUpdateInput.parse({
      id: 42,
      riskLevel: "medium",
      employeeCount: 12,
      analysisNotes: "Seguimiento preventivo documentado.",
      factors: {
        workload: 3,
        control: 3,
        leadership: 2,
        relationships: 3,
        workEnvironment: 2,
      },
    });

    expect(parsed.analysisNotes).toBe("Seguimiento preventivo documentado.");
    expect(parsed.factors?.workload).toBe(3);
  });

  it("rejects factors outside the NOM-035 scale", () => {
    expect(() => jobPositionUpdateInput.parse({
      id: 42,
      factors: {
        workload: 6,
        control: 3,
        leadership: 2,
        relationships: 3,
        workEnvironment: 2,
      },
    })).toThrow();
  });
});
