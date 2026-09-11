import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { VoteInput } from "./domain.js";
import { normalizeIdentifier } from "./domain.js";

export type VoteRow = {
  id: number; event: string; member: string; amount: string;
  wallet: string | null; address: string | null; tx_hash: string | null; voted_at: string | null;
};

export class VoteRepository {
  private db: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        member TEXT NOT NULL,
        amount TEXT NOT NULL,
        wallet TEXT,
        address TEXT,
        tx_hash TEXT,
        voted_at TEXT,
        source_file TEXT NOT NULL,
        source_sheet TEXT NOT NULL,
        source_row INTEGER NOT NULL,
        UNIQUE(source_file, source_sheet, source_row)
      );
      CREATE INDEX IF NOT EXISTS idx_votes_wallet ON votes(wallet);
      CREATE INDEX IF NOT EXISTS idx_votes_address ON votes(address);
      CREATE INDEX IF NOT EXISTS idx_votes_member_event ON votes(member, event);
    `);
  }

  insertMany(votes: VoteInput[], sourceFile: string, sourceSheet: string): number {
    const removeOld = this.db.prepare("DELETE FROM votes WHERE source_file = ? AND source_sheet = ?");
    const insert = this.db.prepare(`INSERT OR REPLACE INTO votes
      (event, member, amount, wallet, address, tx_hash, voted_at, source_file, source_sheet, source_row)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const transaction = this.db.transaction(() => {
      removeOld.run(sourceFile, sourceSheet);
      votes.forEach((v, index) => insert.run(v.event, v.member, v.amount.toString(),
        v.wallet ? normalizeIdentifier(v.wallet) : null,
        v.address ? normalizeIdentifier(v.address) : null,
        v.txHash ?? null, v.votedAt ?? null, sourceFile, sourceSheet, index + 2));
    });
    transaction();
    return votes.length;
  }

  byIdentity(value: string): VoteRow[] {
    const id = normalizeIdentifier(value);
    return this.db.prepare("SELECT * FROM votes WHERE wallet = ? OR address = ? ORDER BY voted_at DESC, id DESC")
      .all(id, id) as VoteRow[];
  }

  byMember(member: string, event?: string): VoteRow[] {
    if (event) return this.db.prepare("SELECT * FROM votes WHERE member = ? COLLATE NOCASE AND event = ? COLLATE NOCASE ORDER BY voted_at, id")
      .all(member.trim(), event.trim()) as VoteRow[];
    return this.db.prepare("SELECT * FROM votes WHERE member = ? COLLATE NOCASE ORDER BY event, voted_at, id")
      .all(member.trim()) as VoteRow[];
  }

}
