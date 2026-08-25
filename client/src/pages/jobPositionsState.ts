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

export type RiskDistribution = Record<
  "muy_alto" | "alto" | "medio" | "bajo",
  number
>;

export function getRiskDistribution(
  positions: Array<{ riskLevel: string }>
): RiskDistribution {
  return positions.reduce<RiskDistribution>(
    (distribution, position) => {
      if (position.riskLevel in distribution) {
        distribution[position.riskLevel as keyof RiskDistribution] += 1;
      }
      return distribution;
    },
    { muy_alto: 0, alto: 0, medio: 0, bajo: 0 }
  );
}
