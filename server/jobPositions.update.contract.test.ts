import { describe, expect, it } from "vitest";
import { jobPositionUpdateInput } from "./routers";

describe("jobPositions.update input contract", () => {
  it("accepts catalog linkage, analysisNotes and valid NOM-035 factors", () => {
    const parsed = jobPositionUpdateInput.parse({
      id: 42,
      catalogPositionId: 17,
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
    expect(parsed.catalogPositionId).toBe(17);
    expect(parsed.factors?.workload).toBe(3);
  });

  it("allows unlinking a historical analysis without deleting it", () => {
    expect(
      jobPositionUpdateInput.parse({ id: 42, catalogPositionId: null })
        .catalogPositionId
    ).toBeNull();
  });

  it("rejects factors outside the NOM-035 scale", () => {
    expect(() =>
      jobPositionUpdateInput.parse({
        id: 42,
        factors: {
          workload: 6,
          control: 3,
          leadership: 2,
          relationships: 3,
          workEnvironment: 2,
        },
      })
    ).toThrow();
  });
});
