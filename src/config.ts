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

const optionalInteger = (value: string | undefined, fallback: number): number => {
  if (!value?.trim()) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`ค่าตัวเลขไม่ถูกต้อง: ${value}`);
  return parsed;
};

export type Ge6IndexerConfig = {
  enabled: boolean;
  apiUrl: string;
  apiKey?: string;
  contractAddress: string;
  startBlock: number;
  pollIntervalMs: number;
  tokenDecimals: number;
  targetMapPath: string;
};

export function ge6IndexerConfig(): Ge6IndexerConfig {
  const contractAddress = (process.env.GE6_CONTRACT_ADDRESS || "0x86a1F49e1b1Cbd69971e99B66123264c75Ac2c8F").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) throw new Error("GE6_CONTRACT_ADDRESS ต้องเป็น address ขนาด 20 bytes");
  const tokenDecimals = optionalInteger(process.env.GE6_TOKEN_DECIMALS, 18);
  if (tokenDecimals > 255) throw new Error("GE6_TOKEN_DECIMALS ต้องอยู่ระหว่าง 0-255");
  return {
    enabled: process.env.GE6_INDEXER_ENABLED?.trim().toLowerCase() !== "false",
    apiUrl: (process.env.TOKENX_BLOCKSCOUT_API_URL || "https://api.tokenx.finance/api/v2").replace(/\/$/, ""),
    apiKey: process.env.TOKENX_BLOCKSCOUT_API_KEY?.trim() || undefined,
    contractAddress,
    startBlock: optionalInteger(process.env.GE6_START_BLOCK, 49_475_830),
    pollIntervalMs: Math.max(optionalInteger(process.env.GE6_POLL_INTERVAL_MS, 10_000), 3_000),
    tokenDecimals,
    targetMapPath: process.env.GE6_TARGET_MAP_PATH || "./data/ge6-vote-targets.json",
  };
}
