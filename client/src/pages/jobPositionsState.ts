export type JobPositionsListState = "loading" | "error" | "empty" | "ready";

export function getJobPositionsListState(input: {
  isLoading: boolean;
  isError: boolean;
  recordCount: number;
}): JobPositionsListState {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  if (input.recordCount === 0) return "empty";
  return "ready";
}
