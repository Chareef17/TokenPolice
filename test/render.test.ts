import assert from "node:assert/strict";
import test from "node:test";
import { transactionsEmbed, walletEmbed } from "../src/render.js";
import type { VoteRow } from "../src/db.js";

const rows: VoteRow[] = [
  { id: 1, event: "GE4", member: "Sita", amount: "10.5", wallet: null,
    address: "0xabc", tx_hash: null, voted_at: "2024-01-02T03:00:00.000Z" },
  { id: 2, event: "GE4", member: "Sita", amount: "2", wallet: null,
    address: "0xabc", tx_hash: null, voted_at: "2024-01-01T03:00:00.000Z" },
];

test("transaction view shows total and each vote", () => {
  const json = transactionsEmbed("0xabc", rows, 1).toJSON();
  assert.equal(json.title, "โหวตทั้งหมด 2 transactions");
  assert.match(json.description ?? "", /Sita/);
  assert.match(json.description ?? "", /10\.5 tokens/);
  assert.match(json.description ?? "", /GE4/);
});

test("wallet summary shows member transaction count", () => {
  const json = walletEmbed("0xabc", rows).toJSON();
  assert.match(json.fields?.[0]?.value ?? "", /12\.5 tokens.*2 tx/);
});
