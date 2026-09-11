import assert from "node:assert/strict";
import test from "node:test";
import { ge6RankTier, isGe6Senbatsu } from "../src/prediction/rank-tier.js";

test("maps GE6 rank boundaries to the official tiers", () => {
  assert.equal(ge6RankTier(1), "kami7");
  assert.equal(ge6RankTier(7), "kami7");
  assert.equal(ge6RankTier(8), "senbatsu");
  assert.equal(ge6RankTier(12), "senbatsu");
  assert.equal(ge6RankTier(13), "under_girls");
  assert.equal(ge6RankTier(24), "under_girls");
  assert.equal(ge6RankTier(25), "next_girls");
  assert.equal(ge6RankTier(36), "next_girls");
  assert.equal(ge6RankTier(37), "unranked");
  assert.equal(ge6RankTier(58), "unranked");
});

test("Kami7 members are also Senbatsu", () => {
  assert.equal(isGe6Senbatsu(1), true);
  assert.equal(isGe6Senbatsu(12), true);
  assert.equal(isGe6Senbatsu(13), false);
});

test("rejects ranks outside 1 through 58", () => {
  assert.throws(() => ge6RankTier(0), RangeError);
  assert.throws(() => ge6RankTier(59), RangeError);
  assert.throws(() => ge6RankTier(1.5), RangeError);
});
