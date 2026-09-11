import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_GUILD_ID: z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(1).optional(),
  ),
});

export const botConfig = () => schema.parse(process.env);
export const historicalDatabasePath = process.env.HISTORICAL_DATABASE_PATH || "./data/historical-votes.sqlite";
export const ge6DatabasePath = process.env.GE6_DATABASE_PATH || "./data/ge6-analysis.sqlite";
export const botSettingsDatabasePath = process.env.BOT_SETTINGS_DATABASE_PATH || "./data/bot-settings.sqlite";
export const tokenxExplorerUrl = process.env.TOKENX_EXPLORER_URL || "https://scan.tokenx.finance";
