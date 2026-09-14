import { EmbedBuilder } from "discord.js";
import { Decimal } from "decimal.js";
import { formatTokens, groupVotes } from "./domain.js";
import type { VoteRow } from "./db.js";

const safe = (value: string, max = 1000) => value.length > max ? `${value.slice(0, max - 1)}…` : value;

// Discord ปฏิเสธ embed ที่รวมทุกส่วนเกิน 6000 ตัวอักษร หรือมีเกิน 25 fields
const EMBED_TOTAL_LIMIT = 6000;
const EMBED_FIELD_LIMIT = 25;
const FOOTER_RESERVE = 200;

function formatVoteDate(value: string | null): string {
  if (!value) return "ไม่ระบุเวลา";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function walletEmbed(identity: string, rows: VoteRow[]): EmbedBuilder {
  const title = "สรุปประวัติการโหวต";
  const description = `\`${safe(identity, 100)}\``;
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0xe91e63);
  if (!rows.length) return embed.addFields({ name: "ผลการค้นหา", value: "ไม่พบข้อมูล" });
  const grouped = [...groupVotes(rows)];
  // เหลือ 1 slot ไว้บอกว่าตัดอะไรทิ้ง เมื่องานมีมากกว่าที่ Discord รับไหว
  const maxFields = grouped.length > EMBED_FIELD_LIMIT ? EMBED_FIELD_LIMIT - 1 : EMBED_FIELD_LIMIT;
  let budget = EMBED_TOTAL_LIMIT - title.length - description.length - FOOTER_RESERVE;
  let shown = 0;
  for (const [event, members] of grouped.slice(0, maxFields)) {
    const transactionCounts = new Map<string, number>();
    rows.filter(row => row.event === event).forEach(row =>
      transactionCounts.set(row.member, (transactionCounts.get(row.member) ?? 0) + 1));
    const value = safe([...members].sort((a, b) => b[1].comparedTo(a[1]))
      .map(([member, amount]) => `• ${member}: **${formatTokens(amount)} tokens** (${transactionCounts.get(member)} tx)`).join("\n"));
    if (budget < event.length + value.length) break;
    budget -= event.length + value.length;
    embed.addFields({ name: event, value });
    shown += 1;
  }
  const hidden = grouped.length - shown;
  if (hidden > 0) embed.addFields({ name: "แสดงไม่ครบ", value: `ยังมีอีก ${hidden} งาน ใช้ \`/transactions\` เพื่อดูทีละรายการ` });
  const total = rows.reduce((sum, row) => sum.plus(row.amount), new Decimal(0));
  return embed.setFooter({ text: `รวม ${formatTokens(total)} tokens • ${rows.length} transactions` });
}

export function memberEmbed(member: string, event: string | undefined, rows: VoteRow[]): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(`ตารางโหวต: ${member}`).setColor(0x8e44ad);
  if (!rows.length) return embed.setDescription("ไม่พบข้อมูล");
  const grouped = new Map<string, Decimal>();
  rows.forEach(r => grouped.set(r.event, (grouped.get(r.event) ?? new Decimal(0)).plus(r.amount)));
  embed.setDescription([...grouped].map(([e, n]) => `**${e}** — ${formatTokens(n)} tokens`).join("\n"));
  if (event) embed.setFooter({ text: `กรองงาน: ${event}` });
  return embed;
}

export function transactionsEmbed(identity: string, rows: VoteRow[], page: number): EmbedBuilder {
  const size = 10;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const list = rows.slice((current - 1) * size, current * size);
  const body = list.map((r, i) => {
    const tx = r.tx_hash ? ` • \`${safe(r.tx_hash, 18)}\`` : "";
    return `${(current - 1) * size + i + 1}. **${r.member}** — ${formatTokens(r.amount)} tokens\n${formatVoteDate(r.voted_at)} • ${r.event}${tx}`;
  }).join("\n");
  return new EmbedBuilder()
    .setTitle(`โหวตทั้งหมด ${rows.length.toLocaleString("en-US")} transactions`)
    .setDescription(body || "ไม่พบข้อมูล")
    .setFooter({ text: `Address: ${safe(identity, 40)} • หน้า ${current}/${pages}` })
    .setColor(0x3498db);
}
