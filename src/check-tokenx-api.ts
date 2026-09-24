import { ge6IndexerConfig } from "./config.js";

const config = ge6IndexerConfig();
const url = new URL(`${config.apiUrl}/addresses/${config.contractAddress}/logs`);
if (config.apiKey) url.searchParams.set("apikey", config.apiKey);

const response = await fetch(url, {
  headers: { accept: "application/json", "user-agent": "TokenPolice/0.1" },
  signal: AbortSignal.timeout(15_000),
});
const body = await response.text();
if (!response.ok) {
  console.error(`Blockscout API ${response.status} ${response.statusText}`);
  console.error(body.slice(0, 500));
  process.exitCode = 1;
} else {
  const parsed = JSON.parse(body) as { items?: unknown[] };
  console.log(`Blockscout API พร้อมใช้งาน: ${url.origin}`);
  console.log(`Contract: ${config.contractAddress}`);
  console.log(`Logs ในหน้าล่าสุด: ${parsed.items?.length ?? 0}`);
}
