import { readFileSync } from "node:fs";
import { Interface, decodeBytes32String, formatUnits } from "ethers";
import type { Client } from "discord.js";
import type { Ge6IndexerConfig } from "./config.js";
import type { Ge6Repository } from "./ge6-db.js";
import type { BotSettingsRepository } from "./bot-settings-db.js";
import { sendWhaleAlerts } from "./whale-alert.js";
import { BlockscoutTransport } from "./blockscout-transport.js";

const votedInterface = new Interface([
  "event Voted(address indexed _voter, uint256 indexed _index, uint256 _amount, bytes32 _hash)",
]);
const votedTopic = votedInterface.getEvent("Voted")!.topicHash.toLowerCase();

type DecodedParameter = { name?: string; type?: string; value?: unknown };
export type BlockscoutLog = {
  block_hash?: string;
  block_number: number;
  data: string;
  decoded?: { method_call?: string; parameters?: DecodedParameter[] } | null;
  index: number;
  timestamp?: string;
  topics: string[];
  transaction_hash: string;
};
type LogsPage = { items: BlockscoutLog[]; next_page_params?: Record<string, string | number | null> | null };
type Checkpoint = { blockNumber: number; logIndex: number };

export type DecodedVote = {
  voterAddress: string;
  voteIndex: string;
  amountRaw: string;
  targetKey: string;
};

function parameter(log: BlockscoutLog, ...names: string[]): unknown {
  const wanted = new Set(names.map(name => name.toLowerCase()));
  return log.decoded?.parameters?.find(item => wanted.has(String(item.name).toLowerCase()))?.value;
}

export function decodeVotedLog(log: BlockscoutLog): DecodedVote | undefined {
  if (log.topics[0]?.toLowerCase() !== votedTopic) return undefined;
  const decodedVoter = parameter(log, "_voter", "voter");
  const decodedIndex = parameter(log, "_index", "index");
  const decodedAmount = parameter(log, "_amount", "amount");
  const decodedHash = parameter(log, "_hash", "hash", "message");
  if (decodedVoter !== undefined && decodedIndex !== undefined && decodedAmount !== undefined && decodedHash !== undefined) {
    return {
      voterAddress: String(decodedVoter).toLowerCase(), voteIndex: String(decodedIndex),
      amountRaw: String(decodedAmount), targetKey: String(decodedHash).toLowerCase(),
    };
  }
  try {
    const parsed = votedInterface.parseLog({ topics: log.topics, data: log.data });
    if (!parsed) return undefined;
    return {
      voterAddress: String(parsed.args._voter).toLowerCase(), voteIndex: String(parsed.args._index),
      amountRaw: String(parsed.args._amount), targetKey: String(parsed.args._hash).toLowerCase(),
    };
  } catch {
    return undefined;
  }
}

export function loadVoteTargetMap(path: string): Map<string, string> {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    return new Map(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, value]) => [key.toLowerCase(), value.trim()]));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return new Map();
    throw new Error(`อ่าน GE6 target map ไม่สำเร็จ (${path}): ${String(error)}`);
  }
}

export function resolveVoteTarget(targetKey: string, targetMap: Map<string, string>): string | undefined {
  const mapped = targetMap.get(targetKey.toLowerCase());
  if (mapped) return mapped;
  try {
    const decoded = decodeBytes32String(targetKey).trim();
    return decoded || undefined;
  } catch {
    return undefined;
  }
}

const isAfter = (log: BlockscoutLog, checkpoint: Checkpoint): boolean =>
  log.block_number > checkpoint.blockNumber || (log.block_number === checkpoint.blockNumber && log.index > checkpoint.logIndex);

export class BlockscoutGe6Indexer {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly stateKey: string;
  private targetMap: Map<string, string>;
  private readonly transport: BlockscoutTransport;

  constructor(
    private readonly client: Client,
    private readonly ge6Repo: Ge6Repository,
    private readonly settingsRepo: BotSettingsRepository,
    private readonly config: Ge6IndexerConfig,
    private readonly explorerUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    this.stateKey = `blockscout:${config.contractAddress.toLowerCase()}:checkpoint`;
    this.targetMap = loadVoteTargetMap(config.targetMapPath);
    this.transport = new BlockscoutTransport(config, explorerUrl, fetchFn);
  }

  start(): void {
    if (!this.config.enabled || this.timer) return;
    void this.pollSafely();
    this.timer = setInterval(() => void this.pollSafely(), this.config.pollIntervalMs);
    this.timer.unref();
    console.log(`GE6 Blockscout indexer (${this.config.accessMode}): ${this.config.contractAddress} เริ่ม block ${this.config.startBlock}`);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    void this.transport.close();
  }

  async pollOnce(): Promise<number> {
    this.targetMap = loadVoteTargetMap(this.config.targetMapPath);
    const checkpoint = this.readCheckpoint();
    const logs = await this.fetchNewLogs(checkpoint);
    let processed = 0;
    for (const log of logs) {
      const vote = decodeVotedLog(log);
      if (!vote) continue;
      if (this.ge6Repo.hasChainEvent(log.transaction_hash, log.index)) {
        this.writeCheckpoint(log);
        continue;
      }
      const amount = formatUnits(vote.amountRaw, this.config.tokenDecimals);
      const member = resolveVoteTarget(vote.targetKey, this.targetMap) || `ไม่ทราบเมมเบอร์ (${vote.targetKey.slice(0, 10)}…)`;
      const candidateId = this.ge6Repo.candidateIdForMember(member);
      const timestamp = log.timestamp || await this.fetchTransactionTimestamp(log.transaction_hash) || new Date().toISOString();
      await sendWhaleAlerts(this.client, this.settingsRepo, {
        member, amount, voterAddress: vote.voterAddress, txHash: log.transaction_hash,
        blockNumber: log.block_number, timestamp,
      }, this.explorerUrl);
      this.ge6Repo.insertChainEvent({
        chainId: "35", contractAddress: this.config.contractAddress, txHash: log.transaction_hash,
        logIndex: log.index, blockNumber: log.block_number, blockHash: log.block_hash || "0x",
        voterAddress: vote.voterAddress, candidateId, amount, blockTimestamp: timestamp,
        rawLogJson: JSON.stringify({ ...log, voteIndex: vote.voteIndex, targetKey: vote.targetKey }),
      });
      this.writeCheckpoint(log);
      processed += 1;
    }
    return processed;
  }

  private async pollSafely(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const count = await this.pollOnce();
      if (count > 0) console.log(`GE6 Blockscout: บันทึก ${count} vote events`);
    } catch (error) {
      console.error("GE6 Blockscout polling error:", error);
    } finally {
      this.running = false;
    }
  }

  private readCheckpoint(): Checkpoint {
    const value = this.ge6Repo.getSyncState(this.stateKey);
    if (!value) return { blockNumber: this.config.startBlock - 1, logIndex: -1 };
    try {
      const parsed = JSON.parse(value) as Checkpoint;
      if (Number.isSafeInteger(parsed.blockNumber) && Number.isSafeInteger(parsed.logIndex)) return parsed;
    } catch { /* use configured start block */ }
    return { blockNumber: this.config.startBlock - 1, logIndex: -1 };
  }

  private writeCheckpoint(log: BlockscoutLog): void {
    this.ge6Repo.setSyncState(this.stateKey, JSON.stringify({ blockNumber: log.block_number, logIndex: log.index }));
  }

  private async fetchNewLogs(checkpoint: Checkpoint): Promise<BlockscoutLog[]> {
    const collected: BlockscoutLog[] = [];
    let cursor: Record<string, string | number | null> | undefined;
    for (let pageNumber = 0; pageNumber < 200; pageNumber += 1) {
      const page = await this.fetchLogsPage(cursor);
      for (const log of page.items) {
        if (isAfter(log, checkpoint) && log.block_number >= this.config.startBlock) collected.push(log);
      }
      const oldest = page.items.at(-1);
      if (!page.next_page_params || !oldest || !isAfter(oldest, checkpoint) || oldest.block_number < this.config.startBlock) break;
      cursor = page.next_page_params;
    }
    return collected.sort((a, b) => a.block_number - b.block_number || a.index - b.index);
  }

  private async fetchLogsPage(cursor?: Record<string, string | number | null>): Promise<LogsPage> {
    const url = new URL(`${this.config.apiUrl}/addresses/${this.config.contractAddress}/logs`);
    if (this.config.apiKey) url.searchParams.set("apikey", this.config.apiKey);
    for (const [key, value] of Object.entries(cursor || {})) if (value !== null) url.searchParams.set(key, String(value));
    return this.transport.getJson<LogsPage>(url);
  }

  private async fetchTransactionTimestamp(hash: string): Promise<string | undefined> {
    const url = new URL(`${this.config.apiUrl}/transactions/${hash}`);
    if (this.config.apiKey) url.searchParams.set("apikey", this.config.apiKey);
    const transaction = await this.transport.getJson<{ timestamp?: string }>(url);
    return transaction.timestamp;
  }
}

export const ge6VotedTopic = votedTopic;
