import { EmbedBuilder } from "discord.js";
import { formatTokens } from "./domain.js";
import type { RankingPrediction } from "./ge6-db.js";

const percent = (value: number): string => new Intl.NumberFormat("th-TH", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
}).format(Math.max(0, Math.min(1, value)));

function runFooter(row: RankingPrediction, page?: string): string {
  const block = row.ge6_as_of_block === null ? "ก่อนเริ่มข้อมูลสด" : `Block ${row.ge6_as_of_block}`;
  const parsed = new Date(row.created_at);
  const createdAt = Number.isNaN(parsed.getTime()) ? row.created_at : new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short",
  }).format(parsed);
  return `ณ ${createdAt} • ${block} • โมเดล ${row.model_version} • จำลอง ${row.simulation_count.toLocaleString("en-US")} รอบ${page ? ` • ${page}` : ""}`;
}

function probabilityAtRank(row: RankingPrediction, rank: number): number {
  if (rank === 1) return row.probability_rank_1;
  try {
    const distribution = JSON.parse(row.rank_distribution_json) as Record<string, unknown>;
    const value = distribution[String(rank)];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function forecastTableEmbed(rows: RankingPrediction[], page: number): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle("ตารางคาดการณ์อันดับ GE6").setColor(0xf1c40f);
  if (!rows.length) return embed.setDescription("ยังไม่มีผลคาดการณ์ กรุณารอรายชื่อผู้สมัครและการประมวลผลโมเดลครั้งแรก");
  const size = 10;
  const pages = Math.ceil(rows.length / size);
  const current = Math.min(page, pages);
  const list = rows.slice((current - 1) * size, current * size);
  embed.setDescription(list.map(row =>
    `**${row.expected_rank.toFixed(1)}**  ${row.member_name} — ${formatTokens(row.expected_tokens)} tokens`,
  ).join("\n"));
  return embed.setFooter({ text: runFooter(rows[0]!, `หน้า ${current}/${pages}`) });
}

export function forecastMemberEmbed(memberName: string, row: RankingPrediction | undefined, requestedRank?: number): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(`คาดการณ์ GE6: ${memberName}`).setColor(0x9b59b6);
  if (!row) return embed.setDescription("ยังไม่มีผลคาดการณ์ของเมมเบอร์คนนี้");
  embed.setDescription(`อันดับคาดหมาย **${row.expected_rank.toFixed(1)}**\nคะแนนคาดหมาย **${formatTokens(row.expected_tokens)} tokens**`);
  embed.addFields(
    { name: "โอกาสอันดับ 1", value: percent(row.probability_rank_1), inline: true },
    { name: "โอกาส Kami7 (1–7)", value: percent(row.probability_kami7), inline: true },
    { name: "โอกาส Senbatsu (1–12)", value: percent(row.probability_senbatsu), inline: true },
    { name: "โอกาส Under Girls (13–24)", value: percent(row.probability_under_girls), inline: true },
    { name: "โอกาส Next Girls (25–36)", value: percent(row.probability_next_girls), inline: true },
    { name: "โอกาสไม่ติดอันดับ (37–58)", value: percent(row.probability_unranked), inline: true },
    { name: "โอกาสอันดับ 13 (Center Under Girls)", value: percent(probabilityAtRank(row, 13)), inline: true },
    { name: "โอกาสอันดับ 25 (Center Next Girls)", value: percent(probabilityAtRank(row, 25)), inline: true },
  );
  if (requestedRank && ![1, 13, 25].includes(requestedRank)) {
    embed.addFields({ name: `โอกาสอันดับ ${requestedRank}`, value: percent(probabilityAtRank(row, requestedRank)), inline: true });
  }
  return embed.setFooter({ text: runFooter(row) });
}
