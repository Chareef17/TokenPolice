import assert from "node:assert/strict";
import test from "node:test";
import { whaleAlertEmbed } from "../src/whale-alert.js";

test("whale alert renders member, amount, masked address and transaction link", () => {
  const json = whaleAlertEmbed({
    member: "Sita", amount: "1000", voterAddress: "0x1234567890123456789012345678901234567890",
    txHash: "0xabc", blockNumber: 123, timestamp: "2026-01-01T00:00:00Z",
  }, "https://scan.tokenx.finance/").toJSON();
  assert.equal(json.title, "Whale Alert");
  assert.equal(json.url, "https://scan.tokenx.finance/tx/0xabc");
  assert.match(json.fields?.map(field => field.value).join(" ") ?? "", /1,000 tokens/);
  assert.doesNotMatch(json.fields?.map(field => field.value).join(" ") ?? "", /0x1234567890123456789012345678901234567890/);
});
