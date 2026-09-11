export const GE6_CANDIDATE_COUNT = 58;

export type Ge6RankTier = "kami7" | "senbatsu" | "under_girls" | "next_girls" | "unranked";

export function ge6RankTier(rank: number): Ge6RankTier {
  if (!Number.isInteger(rank) || rank < 1 || rank > GE6_CANDIDATE_COUNT) {
    throw new RangeError(`GE6 rank must be an integer from 1 to ${GE6_CANDIDATE_COUNT}`);
  }
  if (rank <= 7) return "kami7";
  if (rank <= 12) return "senbatsu";
  if (rank <= 24) return "under_girls";
  if (rank <= 36) return "next_girls";
  return "unranked";
}

export const isGe6Senbatsu = (rank: number): boolean => {
  ge6RankTier(rank);
  return rank <= 12;
};
