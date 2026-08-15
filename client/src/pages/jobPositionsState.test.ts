import { describe, expect, it } from "vitest";
import { getJobPositionsListState, getRiskDistribution } from "./jobPositionsState";

describe("getJobPositionsListState", () => {
  it("prioritizes the loading state before any other visual state", () => {
    expect(getJobPositionsListState({ isLoading: true, isError: true, recordCount: 0 })).toBe("loading");
  });

  it("shows a recoverable error state when the query fails", () => {
    expect(getJobPositionsListState({ isLoading: false, isError: true, recordCount: 0 })).toBe("error");
  });

  it("distinguishes a real empty list from a ready list", () => {
    expect(getJobPositionsListState({ isLoading: false, isError: false, recordCount: 0 })).toBe("empty");
    expect(getJobPositionsListState({ isLoading: false, isError: false, recordCount: 1 })).toBe("ready");
  });
});

describe("getRiskDistribution", () => {
  it("accounts for all normalized Spanish risk levels used by the PDF", () => {
    expect(getRiskDistribution([
      { riskLevel: "muy_alto" },
      { riskLevel: "alto" },
      { riskLevel: "alto" },
      { riskLevel: "medio" },
      { riskLevel: "bajo" },
      { riskLevel: "unknown" },
    ])).toEqual({ muy_alto: 1, alto: 2, medio: 1, bajo: 1 });
  });
});
