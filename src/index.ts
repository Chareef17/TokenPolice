import { ChannelType, Client, Events, GatewayIntentBits, PermissionFlagsBits } from "discord.js";
import { botConfig, botSettingsDatabasePath, ge6DatabasePath, ge6IndexerConfig, historicalDatabasePath, tokenxExplorerUrl } from "./config.js";
import { VoteRepository } from "./db.js";
import { commands } from "./commands.js";
import { memberEmbed, transactionsEmbed, walletEmbed } from "./render.js";
import { Ge6Repository } from "./ge6-db.js";
import { forecastMemberEmbed, forecastTableEmbed } from "./forecast-render.js";
import { BotSettingsRepository } from "./bot-settings-db.js";
import { canonicalAmount } from "./domain.js";
import { sendWhaleAlerts } from "./whale-alert.js";
import { candidateDetail, candidateListEmbed } from "./candidate-render.js";
import { BlockscoutGe6Indexer } from "./blockscout-ge6-indexer.js";

const config = botConfig();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const repo = new VoteRepository(historicalDatabasePath);
const ge6Repo = new Ge6Repository(ge6DatabasePath);
const settingsRepo = new BotSettingsRepository(botSettingsDatabasePath);
const ge6Indexer = new BlockscoutGe6Indexer(client, ge6Repo, settingsRepo, ge6IndexerConfig(), tokenxExplorerUrl);

client.once(Events.ClientReady, async ready => {
  if (config.DISCORD_GUILD_ID) {
    const guild = await ready.guilds.fetch(config.DISCORD_GUILD_ID);
    await guild.commands.set(commands);
    console.log(`ติดตั้ง ${commands.length} commands ใน ${guild.name}`);
  } else {
    await ready.application.commands.set([]);
    const guilds = [...ready.guilds.cache.values()];
    await Promise.all(guilds.map(guild => guild.commands.set(commands)));
    console.log(`ติดตั้ง ${commands.length} commands ใน ${guilds.length} servers`);
  }
  console.log(`พร้อมใช้งาน: ${ready.user.tag}`);
  ge6Indexer.start();
});

process.once("SIGINT", () => { ge6Indexer.stop(); client.destroy(); });
process.once("SIGTERM", () => { ge6Indexer.stop(); client.destroy(); });
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "ge6") {
      const query = interaction.options.getFocused();
      await interaction.respond(ge6Repo.searchCandidates(String(query)));
    }
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  try {
    if (interaction.commandName === "wallet") {
      const id = interaction.options.getString("id", true);
      const visibility = settingsRepo.getVisibility(interaction.guildId, "wallet");
      await interaction.reply({ embeds: [walletEmbed(id, repo.byIdentity(id))], ephemeral: visibility === "private" });
    } else if (interaction.commandName === "member") {
      const name = interaction.options.getString("name", true);
      const event = interaction.options.getString("event") ?? undefined;
      await interaction.reply({ embeds: [memberEmbed(name, event, repo.byMember(name, event))] });
    } else if (interaction.commandName === "transactions") {
      const id = interaction.options.getString("id", true);
      const event = interaction.options.getString("event") ?? undefined;
      const page = interaction.options.getInteger("page") ?? 1;
      const rows = repo.byIdentity(id).filter(r => !event || r.event.toLowerCase() === event.toLowerCase());
      const visibility = settingsRepo.getVisibility(interaction.guildId, "transactions");
      await interaction.reply({ embeds: [transactionsEmbed(id, rows, page)], ephemeral: visibility === "private" });
    } else if (interaction.commandName === "privacy") {
      if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: "คำสั่งนี้ใช้ได้เฉพาะผู้ดูแลเซิร์ฟเวอร์", ephemeral: true });
        return;
      }
      const command = interaction.options.getString("command", true) as "wallet" | "transactions";
      const visibility = interaction.options.getString("visibility", true) as "private" | "public";
      settingsRepo.setVisibility(interaction.guildId, command, visibility);
      const label = visibility === "private" ? "เฉพาะผู้ค้นหา" : "ทุกคนในห้อง";
      await interaction.reply({ content: `ตั้งค่า /${command} เป็น **${label}** แล้ว`, ephemeral: true });
    } else if (interaction.commandName === "forecast") {
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === "table") {
        const page = interaction.options.getInteger("page") ?? 1;
        await interaction.reply({ embeds: [forecastTableEmbed(ge6Repo.latestRankings(), page)] });
      } else {
        const name = interaction.options.getString("name", true);
        const rank = interaction.options.getInteger("rank") ?? undefined;
        await interaction.reply({ embeds: [forecastMemberEmbed(name, ge6Repo.latestMemberPrediction(name), rank)] });
      }
    } else if (interaction.commandName === "whale") {
      if (!interaction.guild || !interaction.memberPermissions?.has([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels])) {
        await interaction.reply({ content: "คำสั่งนี้ใช้ได้เฉพาะผู้ดูแลที่มีสิทธิ์ Manage Server และ Manage Channels", ephemeral: true });
        return;
      }
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === "setup") {
        const selectedChannel = interaction.options.getChannel("channel", true);
        const channel = await interaction.guild.channels.fetch(selectedChannel.id);
        if (!channel || channel.type !== ChannelType.GuildText) {
          await interaction.reply({ content: "กรุณาเลือก Text Channel", ephemeral: true });
          return;
        }
        const threshold = canonicalAmount(interaction.options.getNumber("threshold") ?? 1000);
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: false, AddReactions: false, CreatePublicThreads: false,
          CreatePrivateThreads: false, SendMessagesInThreads: false,
        });
        await channel.permissionOverwrites.edit(interaction.client.user.id, {
          ViewChannel: true, SendMessages: true, EmbedLinks: true,
        });
        settingsRepo.setWhaleConfig(interaction.guild.id, channel.id, threshold);
        await interaction.reply({ content: `ตั้ง Whale Alert ที่ ${channel} สำหรับยอดตั้งแต่ **${threshold} tokens** และล็อกห้องแล้ว`, ephemeral: true });
      } else if (subcommand === "test") {
        const config = settingsRepo.getWhaleConfig(interaction.guild.id);
        if (!config?.enabled) {
          await interaction.reply({ content: "ยังไม่ได้ตั้งห้อง Whale Alert กรุณาใช้ /whale setup ก่อน", ephemeral: true });
          return;
        }
        const amount = canonicalAmount(interaction.options.getNumber("amount", true));
        const sent = await sendWhaleAlerts(interaction.client, settingsRepo, {
          member: interaction.options.getString("member", true), amount,
          voterAddress: interaction.options.getString("address") ?? "0x0000000000000000000000000000000000000000",
          timestamp: new Date().toISOString(),
        }, tokenxExplorerUrl, interaction.guild.id);
        await interaction.reply({ content: sent ? "ส่ง Whale Alert ทดสอบแล้ว" : `ยอดทดสอบต่ำกว่า threshold ${config.threshold} tokens`, ephemeral: true });
      } else if (subcommand === "status") {
        const whale = settingsRepo.getWhaleConfig(interaction.guild.id);
        const message = whale?.enabled
          ? `Whale Alert เปิดอยู่ที่ <#${whale.channelId}> ยอดขั้นต่ำ **${whale.threshold} tokens**`
          : "Whale Alert ยังไม่เปิดใช้งาน";
        await interaction.reply({ content: message, ephemeral: true });
      } else {
        settingsRepo.disableWhaleAlerts(interaction.guild.id);
        await interaction.reply({ content: "ปิด Whale Alert แล้ว (สิทธิ์ของห้องยังคงล็อกอยู่)", ephemeral: true });
      }
    } else if (interaction.commandName === "ge6") {
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === "candidates") {
        const page = interaction.options.getInteger("page") ?? 1;
        await interaction.reply({ embeds: [candidateListEmbed(ge6Repo.candidateProfiles(), page)] });
      } else {
        const name = interaction.options.getString("name", true);
        await interaction.reply(candidateDetail(ge6Repo.candidateProfile(name)));
      }
    }
  } catch (error) {
    console.error(error);
    const message = "เกิดข้อผิดพลาดในการค้นข้อมูล กรุณาลองใหม่";
    if (interaction.replied || interaction.deferred) await interaction.followUp({ content: message, ephemeral: true });
    else await interaction.reply({ content: message, ephemeral: true });
  }
});

await client.login(config.DISCORD_TOKEN);
