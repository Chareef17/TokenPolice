import assert from "node:assert/strict";
import test from "node:test";
import { formatTokens, groupVotes, normalizeIdentifier } from "../src/domain.js";

test("normalizes wallet/address", () => assert.equal(normalizeIdentifier(" 0xAbC "), "0xabc"));
test("groups exact decimal totals by event and member", () => {
  const grouped = groupVotes([
    { event: "GE4", member: "Sita", amount: "3000" },
    { event: "GE4", member: "Sita", amount: "2.123456789" },
    { event: "GE5", member: "Nammonn", amount: "500" },
  ]);
  assert.equal(grouped.get("GE4")?.get("Sita")?.toString(), "3002.123456789");
  assert.equal(grouped.get("GE5")?.get("Nammonn")?.toString(), "500");
});
test("formats decimal token amounts", () => assert.equal(formatTokens("1234567.8900"), "1,234,567.89"));
