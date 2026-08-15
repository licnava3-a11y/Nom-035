import { describe, expect, it } from "vitest";
import { getJobPositionsListState } from "./jobPositionsState";

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
