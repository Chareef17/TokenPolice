import { Client, EmbedBuilder } from "discord.js";
import { Decimal } from "decimal.js";
import type { BotSettingsRepository } from "./bot-settings-db.js";
import { formatTokens, normalizeIdentifier } from "./domain.js";

// GE6 เป็น blind vote จึงไม่รู้ว่าโหวตให้ใคร รู้แค่ address จำนวนโหวต เวลา และ transaction
export type WhaleVote = {
  amount: string;
  voterAddress: string;
  txHash?: string;
  blockNumber?: number;
  timestamp: string;
};

const shortAddress = (value: string): string => value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;

const discordTime = (timestamp: string): string | undefined => {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? undefined : `<t:${Math.floor(parsed / 1000)}:f> (<t:${Math.floor(parsed / 1000)}:R>)`;
};

export function whaleAlertEmbed(vote: WhaleVote, explorerUrl: string): EmbedBuilder {
  const explorer = explorerUrl.replace(/\/$/, "");
  const embed = new EmbedBuilder()
    .setTitle("Whale Alert")
    .setColor(0x00bcd4)
    .addFields(
      { name: "Votes", value: `**${formatTokens(vote.amount)} tokens**`, inline: true },
      { name: "Address", value: `\`${shortAddress(normalizeIdentifier(vote.voterAddress))}\``, inline: true },
    );
  if (vote.blockNumber !== undefined) embed.addFields({ name: "Block", value: vote.blockNumber.toLocaleString("en-US"), inline: true });
  const time = discordTime(vote.timestamp);
  if (time) embed.addFields({ name: "Time", value: time, inline: false }).setTimestamp(new Date(vote.timestamp));
  if (vote.txHash) {
    embed.addFields({ name: "Transaction", value: `[\`${shortAddress(vote.txHash)}\`](${explorer}/tx/${vote.txHash})`, inline: false });
    embed.setURL(`${explorer}/tx/${vote.txHash}`);
  }
  return embed;
}

export async function sendWhaleAlerts(client: Client, settings: BotSettingsRepository, vote: WhaleVote, explorerUrl: string, targetGuildId?: string): Promise<number> {
  let sent = 0;
  for (const guild of client.guilds.cache.values()) {
    if (targetGuildId && guild.id !== targetGuildId) continue;
    const config = settings.getWhaleConfig(guild.id);
    if (!config?.enabled || new Decimal(vote.amount).lessThan(config.threshold)) continue;
    const channel = await client.channels.fetch(config.channelId).catch(() => null);
    if (!channel?.isSendable()) continue;
    await channel.send({ embeds: [whaleAlertEmbed(vote, explorerUrl)] });
    sent += 1;
  }
  return sent;
}
