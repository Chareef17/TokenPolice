import assert from "node:assert/strict";
import test from "node:test";
import { candidateDetail, candidateListEmbed } from "../src/candidate-render.js";

const candidate = { candidateId: "Sita_BNK48", memberName: "Sita", groupName: "BNK48",
  teamName: "BNK48 Team BIII", sourceUrl: "https://withmywish.com/ge2026/", active: true,
  fetchedAt: "2026-09-09", songs: ["Song A", "Song B", "Song C"] };

test("candidate list shows roster and team", () => {
  assert.match(candidateListEmbed([candidate], 1).toJSON().description ?? "", /Sita.*BNK48 Team BIII/);
});

test("candidate detail shows three songs and source button", () => {
  const view = candidateDetail(candidate);
  const json = view.embeds[0]!.toJSON();
  assert.match(json.fields?.[0]?.value ?? "", /1\. Song A.*3\. Song C/s);
  assert.equal(view.components[0]!.toJSON().components[0]?.url, "https://withmywish.com/ge2026/");
});
