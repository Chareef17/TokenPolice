import { ge6IndexerConfig } from "./config.js";
import { BlockscoutTransport } from "./blockscout-transport.js";

const config = ge6IndexerConfig();
const url = new URL(`${config.apiUrl}/addresses/${config.contractAddress}/logs`);
if (config.apiKey) url.searchParams.set("apikey", config.apiKey);

const transport = new BlockscoutTransport(config, "https://scan.tokenx.finance");
try {
  const parsed = await transport.getJson<{ items?: unknown[] }>(url);
  console.log(`Blockscout ${config.accessMode} mode พร้อมใช้งาน: ${url.origin}`);
  console.log(`Contract: ${config.contractAddress}`);
  console.log(`Logs ในหน้าล่าสุด: ${parsed.items?.length ?? 0}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await transport.close();
}
