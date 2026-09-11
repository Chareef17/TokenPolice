import assert from "node:assert/strict";
import test from "node:test";
import { forecastMemberEmbed, forecastTableEmbed } from "../src/forecast-render.js";
import type { RankingPrediction } from "../src/ge6-db.js";

const prediction: RankingPrediction = {
  run_id: 1, candidate_id: "sita", member_name: "Sita", group_name: "BNK48",
  expected_tokens: "12345.67", expected_rank: 8.4,
  probability_rank_1: 0.05, probability_kami7: 0.42, probability_senbatsu: 0.71,
  probability_under_girls: 0.2, probability_next_girls: 0.07, probability_unranked: 0.02,
  rank_distribution_json: JSON.stringify({ "1": 0.05, "13": 0.04, "25": 0.01, "30": 0.005 }),
  model_version: "test-v1", ge6_as_of_block: 123, simulation_count: 10000,
  created_at: "2026-01-01T00:00:00Z",
};

test("forecast table renders expected rank and tokens", () => {
  const json = forecastTableEmbed([prediction], 1).toJSON();
  assert.match(json.description ?? "", /8\.4.*Sita.*12,345\.67/);
});

test("member forecast renders tiers and center rank probabilities", () => {
  const json = forecastMemberEmbed("Sita", prediction, 30).toJSON();
  const labels = (json.fields ?? []).map(field => field.name).join("|");
  assert.match(labels, /Kami7/);
  assert.match(labels, /อันดับ 13/);
  assert.match(labels, /อันดับ 25/);
  assert.match(labels, /อันดับ 30/);
});

test("forecast clearly reports missing model output", () => {
  assert.match(forecastTableEmbed([], 1).toJSON().description ?? "", /ยังไม่มีผลคาดการณ์/);
});
