import assert from "node:assert/strict";
import test from "node:test";
import { whaleAlertEmbed } from "../src/whale-alert.js";

const vote = {
  amount: "1000", voterAddress: "0x1234567890123456789012345678901234567890",
  txHash: "0xabcdef1234567890abcdef", blockNumber: 123, timestamp: "2026-01-01T00:00:00Z",
};

test("whale alert renders votes, masked address, time and transaction link", () => {
  const json = whaleAlertEmbed(vote, "https://scan.tokenx.finance/").toJSON();
  const fields = json.fields ?? [];
  assert.equal(json.title, "Whale Alert");
  assert.equal(json.url, "https://scan.tokenx.finance/tx/0xabcdef1234567890abcdef");
  assert.deepEqual(fields.map(field => field.name), ["Votes", "Address", "Block", "Time", "Transaction"]);
  assert.match(fields.find(field => field.name === "Votes")?.value ?? "", /1,000 tokens/);
  assert.match(fields.find(field => field.name === "Time")?.value ?? "", /^<t:1767225600:f> \(<t:1767225600:R>\)$/);
  assert.match(fields.find(field => field.name === "Transaction")?.value ?? "",
    /^\[`0xabcdef…abcdef`\]\(https:\/\/scan\.tokenx\.finance\/tx\/0xabcdef1234567890abcdef\)$/);
});

test("whale alert never leaks the full voter address", () => {
  const json = whaleAlertEmbed(vote, "https://scan.tokenx.finance/").toJSON();
  assert.doesNotMatch(json.fields?.map(field => field.value).join(" ") ?? "", /0x1234567890123456789012345678901234567890/);
});

test("whale alert omits transaction and block when the chain data is missing", () => {
  const json = whaleAlertEmbed({ amount: "1000", voterAddress: "0xabc", timestamp: "2026-01-01T00:00:00Z" }, "https://scan.tokenx.finance").toJSON();
  assert.deepEqual(json.fields?.map(field => field.name), ["Votes", "Address", "Time"]);
  assert.equal(json.url, undefined);
});

test("whale alert survives an unparsable timestamp", () => {
  const json = whaleAlertEmbed({ amount: "1000", voterAddress: "0xabc", timestamp: "ไม่ใช่เวลา" }, "https://scan.tokenx.finance").toJSON();
  assert.deepEqual(json.fields?.map(field => field.name), ["Votes", "Address"]);
  assert.equal(json.timestamp, undefined);
});
