import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { CandidateProfile } from "./ge6-db.js";

export function candidateListEmbed(candidates: CandidateProfile[], page: number): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle("ผู้สมัคร GE6 ทั้งหมด").setColor(0xe91e63);
  if (!candidates.length) return embed.setDescription("ยังไม่มีข้อมูลผู้สมัคร กรุณา sync รายชื่อก่อน");
  const size = 10;
  const pages = Math.ceil(candidates.length / size);
  const current = Math.min(page, pages);
  const list = candidates.slice((current - 1) * size, current * size);
  embed.setDescription(list.map((candidate, index) =>
    `${(current - 1) * size + index + 1}. **${candidate.memberName}** — ${candidate.teamName}`,
  ).join("\n"));
  return embed.setFooter({ text: `${candidates.length} คน • หน้า ${current}/${pages}` });
}

export function candidateDetail(candidate: CandidateProfile | undefined): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  if (!candidate) return {
    embeds: [new EmbedBuilder().setTitle("ไม่พบเมมเบอร์").setDescription("ไม่พบชื่อในรายชื่อผู้สมัคร GE6")],
    components: [],
  };
  const embed = new EmbedBuilder()
    .setTitle(`${candidate.memberName} — ${candidate.groupName}`)
    .setDescription(candidate.teamName)
    .addFields({ name: "เพลงที่คาดหวัง", value: candidate.songs.map((song, index) => `${index + 1}. ${song}`).join("\n") })
    .setColor(candidate.groupName === "CGM48" ? 0x00a651 : 0xe91e63)
    .setFooter({ text: `อัปเดตข้อมูล ${candidate.fetchedAt} • withmywish.com` });
  if (candidate.imageUrl) embed.setThumbnail(candidate.imageUrl);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("เปิดข้อมูลต้นทาง").setStyle(ButtonStyle.Link).setURL(candidate.sourceUrl),
  );
  return { embeds: [embed], components: [row] };
}
