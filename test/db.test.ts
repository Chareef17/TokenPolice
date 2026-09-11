import assert from "node:assert/strict";
import test from "node:test";
import { BotSettingsRepository } from "../src/bot-settings-db.js";
import { Ge6Repository } from "../src/ge6-db.js";

test("visibility defaults to private and persists per guild", () => {
  const repo = new BotSettingsRepository(":memory:");
  assert.equal(repo.getVisibility("guild-1", "wallet"), "private");
  repo.setVisibility("guild-1", "wallet", "public");
  assert.equal(repo.getVisibility("guild-1", "wallet"), "public");
  assert.equal(repo.getVisibility("guild-1", "transactions"), "private");
  assert.equal(repo.getVisibility("guild-2", "wallet"), "private");
  assert.equal(repo.getVisibility(null, "wallet"), "private");
});

test("stores and retrieves GE6 candidate songs", () => {
  const repo = new Ge6Repository(":memory:");
  repo.replaceCandidateRoster([{ candidateId: "Sita_BNK48", memberName: "Sita", groupName: "BNK48",
    teamName: "BNK48 Team BIII", sourceUrl: "https://example.com", songs: ["Song A", "Song B", "Song C"] }]);
  assert.equal(repo.candidateProfiles().length, 1);
  assert.deepEqual(repo.candidateProfile("sita")?.songs, ["Song A", "Song B", "Song C"]);
  assert.deepEqual(repo.searchCandidates("sit"), [{ name: "Sita", value: "Sita" }]);
});
