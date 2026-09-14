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

test("wallet summary of a normal wallet is not marked as truncated", () => {
  const json = walletEmbed("0xabc", rows).toJSON();
  assert.deepEqual(json.fields?.map(field => field.name), ["GE4"]);
});

// ขนาดที่ Discord นับรวมเพื่อเทียบกับเพดาน 6000
const embedSize = (json: { title?: string; description?: string; footer?: { text: string };
  fields?: { name: string; value: string }[] }): number =>
  (json.title?.length ?? 0) + (json.description?.length ?? 0) + (json.footer?.text?.length ?? 0) +
  (json.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0);

test("wallet summary stays inside the Discord embed limits when a wallet voted everywhere", () => {
  const many: VoteRow[] = [];
  let id = 0;
  for (let event = 0; event < 40; event += 1) {
    for (let member = 0; member < 60; member += 1) {
      many.push({ id: (id += 1), event: `LongEventName${event}`, member: `MemberWithAVeryLongName${member}`,
        amount: "1", wallet: null, address: "0xabc", tx_hash: null, voted_at: null });
    }
  }
  const json = walletEmbed("0xabc", many).toJSON();
  const fields = json.fields ?? [];
  assert.ok(fields.length <= 25, `ได้ ${fields.length} fields`);
  assert.ok(embedSize(json) <= 6000, `ได้ ${embedSize(json)} chars`);
  assert.ok(fields.every(field => field.value.length <= 1024));
  assert.equal(fields.at(-1)?.name, "แสดงไม่ครบ");
  assert.match(json.footer?.text ?? "", /2400 transactions/);
});
