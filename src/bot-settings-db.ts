import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type WhaleConfig = { channelId: string; threshold: string; enabled: boolean };

export class BotSettingsRepository {
  private db: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        PRIMARY KEY (guild_id, setting_key)
      );
      CREATE TABLE IF NOT EXISTS whale_alert_settings (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        threshold TEXT NOT NULL DEFAULT '1000',
        enabled INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  getVisibility(guildId: string | null, command: "wallet" | "transactions"): "private" | "public" {
    if (!guildId) return "private";
    const row = this.db.prepare("SELECT setting_value FROM guild_settings WHERE guild_id = ? AND setting_key = ?")
      .get(guildId, `${command}_visibility`) as { setting_value: string } | undefined;
    return row?.setting_value === "public" ? "public" : "private";
  }

  setVisibility(guildId: string, command: "wallet" | "transactions", visibility: "private" | "public"): void {
    this.db.prepare(`INSERT INTO guild_settings (guild_id, setting_key, setting_value) VALUES (?, ?, ?)
      ON CONFLICT(guild_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value`)
      .run(guildId, `${command}_visibility`, visibility);
  }

  getWhaleConfig(guildId: string): WhaleConfig | undefined {
    const row = this.db.prepare("SELECT channel_id, threshold, enabled FROM whale_alert_settings WHERE guild_id = ?")
      .get(guildId) as { channel_id: string; threshold: string; enabled: number } | undefined;
    return row ? { channelId: row.channel_id, threshold: row.threshold, enabled: row.enabled === 1 } : undefined;
  }

  setWhaleConfig(guildId: string, channelId: string, threshold: string): void {
    this.db.prepare(`INSERT INTO whale_alert_settings (guild_id, channel_id, threshold, enabled)
      VALUES (?, ?, ?, 1) ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id,
      threshold = excluded.threshold, enabled = 1, updated_at = CURRENT_TIMESTAMP`)
      .run(guildId, channelId, threshold);
  }

  disableWhaleAlerts(guildId: string): void {
    this.db.prepare("UPDATE whale_alert_settings SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?")
      .run(guildId);
  }
}
