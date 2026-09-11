import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type RankingPrediction = {
  run_id: number;
  candidate_id: string;
  member_name: string;
  group_name: string | null;
  expected_tokens: string;
  expected_rank: number;
  probability_rank_1: number;
  probability_kami7: number;
  probability_senbatsu: number;
  probability_under_girls: number;
  probability_next_girls: number;
  probability_unranked: number;
  rank_distribution_json: string;
  model_version: string;
  ge6_as_of_block: number | null;
  simulation_count: number;
  created_at: string;
};

export type CandidateInput = {
  candidateId: string;
  memberName: string;
  groupName: string;
  teamName: string;
  imageUrl?: string;
  sourceUrl: string;
  songs: string[];
};

export type CandidateProfile = CandidateInput & { active: boolean; fetchedAt: string };

export class Ge6Repository {
  private db: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS candidates (
        candidate_id TEXT PRIMARY KEY,
        member_name TEXT NOT NULL,
        group_name TEXT,
        recipient_address TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS chain_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chain_id TEXT NOT NULL,
        contract_address TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        log_index INTEGER NOT NULL,
        block_number INTEGER NOT NULL,
        block_hash TEXT NOT NULL,
        voter_address TEXT NOT NULL,
        candidate_id TEXT,
        amount TEXT NOT NULL,
        block_timestamp TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        raw_log_json TEXT NOT NULL,
        UNIQUE(tx_hash, log_index),
        FOREIGN KEY(candidate_id) REFERENCES candidates(candidate_id)
      );
      CREATE INDEX IF NOT EXISTS idx_ge6_voter ON chain_events(voter_address);
      CREATE INDEX IF NOT EXISTS idx_ge6_candidate_block ON chain_events(candidate_id, block_number);

      CREATE TABLE IF NOT EXISTS candidate_profiles (
        candidate_id TEXT PRIMARY KEY,
        team_name TEXT NOT NULL,
        image_url TEXT,
        source_url TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(candidate_id) REFERENCES candidates(candidate_id)
      );

      CREATE TABLE IF NOT EXISTS candidate_songs (
        candidate_id TEXT NOT NULL,
        priority INTEGER NOT NULL,
        song_title TEXT NOT NULL,
        source_url TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(candidate_id, priority),
        FOREIGN KEY(candidate_id) REFERENCES candidates(candidate_id)
      );

      CREATE TABLE IF NOT EXISTS sync_state (
        state_key TEXT PRIMARY KEY,
        state_value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS prediction_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_version TEXT NOT NULL,
        historical_cutoff TEXT NOT NULL,
        ge6_as_of_block INTEGER,
        simulation_count INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ranking_predictions (
        run_id INTEGER NOT NULL,
        candidate_id TEXT NOT NULL,
        expected_tokens TEXT NOT NULL,
        expected_rank REAL NOT NULL,
        probability_rank_1 REAL NOT NULL,
        probability_kami7 REAL NOT NULL,
        probability_senbatsu REAL NOT NULL,
        probability_under_girls REAL NOT NULL,
        probability_next_girls REAL NOT NULL,
        probability_unranked REAL NOT NULL,
        rank_distribution_json TEXT NOT NULL,
        PRIMARY KEY(run_id, candidate_id),
        FOREIGN KEY(run_id) REFERENCES prediction_runs(id),
        FOREIGN KEY(candidate_id) REFERENCES candidates(candidate_id)
      );

      CREATE TABLE IF NOT EXISTS wallet_predictions (
        run_id INTEGER NOT NULL,
        wallet_address TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        probability REAL NOT NULL,
        expected_tokens TEXT NOT NULL,
        PRIMARY KEY(run_id, wallet_address, candidate_id),
        FOREIGN KEY(run_id) REFERENCES prediction_runs(id),
        FOREIGN KEY(candidate_id) REFERENCES candidates(candidate_id)
      );
    `);
  }

  latestRankings(): RankingPrediction[] {
    return this.db.prepare(`
      SELECT rp.*, c.member_name, c.group_name, pr.model_version, pr.ge6_as_of_block,
             pr.simulation_count, pr.created_at
      FROM ranking_predictions rp
      JOIN candidates c ON c.candidate_id = rp.candidate_id
      JOIN prediction_runs pr ON pr.id = rp.run_id
      WHERE rp.run_id = (SELECT MAX(id) FROM prediction_runs)
      ORDER BY rp.expected_rank ASC, c.member_name COLLATE NOCASE
    `).all() as RankingPrediction[];
  }

  latestMemberPrediction(memberName: string): RankingPrediction | undefined {
    return this.db.prepare(`
      SELECT rp.*, c.member_name, c.group_name, pr.model_version, pr.ge6_as_of_block,
             pr.simulation_count, pr.created_at
      FROM ranking_predictions rp
      JOIN candidates c ON c.candidate_id = rp.candidate_id
      JOIN prediction_runs pr ON pr.id = rp.run_id
      WHERE rp.run_id = (SELECT MAX(id) FROM prediction_runs)
        AND c.member_name = ? COLLATE NOCASE
      LIMIT 1
    `).get(memberName.trim()) as RankingPrediction | undefined;
  }

  replaceCandidateRoster(candidates: CandidateInput[]): void {
    const markInactive = this.db.prepare("UPDATE candidate_profiles SET active = 0");
    const upsertCandidate = this.db.prepare(`INSERT INTO candidates (candidate_id, member_name, group_name)
      VALUES (?, ?, ?) ON CONFLICT(candidate_id) DO UPDATE SET member_name = excluded.member_name,
      group_name = excluded.group_name`);
    const upsertProfile = this.db.prepare(`INSERT INTO candidate_profiles
      (candidate_id, team_name, image_url, source_url, active, fetched_at) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(candidate_id) DO UPDATE SET team_name = excluded.team_name, image_url = excluded.image_url,
      source_url = excluded.source_url, active = 1, fetched_at = CURRENT_TIMESTAMP`);
    const removeSongs = this.db.prepare("DELETE FROM candidate_songs WHERE candidate_id = ?");
    const insertSong = this.db.prepare(`INSERT INTO candidate_songs
      (candidate_id, priority, song_title, source_url) VALUES (?, ?, ?, ?)`);
    this.db.transaction(() => {
      markInactive.run();
      for (const candidate of candidates) {
        upsertCandidate.run(candidate.candidateId, candidate.memberName, candidate.groupName);
        upsertProfile.run(candidate.candidateId, candidate.teamName, candidate.imageUrl ?? null, candidate.sourceUrl);
        removeSongs.run(candidate.candidateId);
        candidate.songs.forEach((song, index) => insertSong.run(candidate.candidateId, index + 1, song, candidate.sourceUrl));
      }
    })();
  }

  candidateProfiles(): CandidateProfile[] {
    const rows = this.db.prepare(`SELECT c.candidate_id, c.member_name, c.group_name, p.team_name,
      p.image_url, p.source_url, p.active, p.fetched_at
      FROM candidates c JOIN candidate_profiles p ON p.candidate_id = c.candidate_id
      WHERE p.active = 1 ORDER BY c.group_name, c.member_name COLLATE NOCASE`).all() as Array<Record<string, unknown>>;
    return rows.map(row => this.hydrateCandidate(row));
  }

  candidateProfile(memberName: string): CandidateProfile | undefined {
    const row = this.db.prepare(`SELECT c.candidate_id, c.member_name, c.group_name, p.team_name,
      p.image_url, p.source_url, p.active, p.fetched_at
      FROM candidates c JOIN candidate_profiles p ON p.candidate_id = c.candidate_id
      WHERE p.active = 1 AND c.member_name = ? COLLATE NOCASE LIMIT 1`).get(memberName.trim()) as Record<string, unknown> | undefined;
    return row ? this.hydrateCandidate(row) : undefined;
  }

  searchCandidates(query: string): Array<{ name: string; value: string }> {
    return this.db.prepare(`SELECT c.member_name name, c.member_name value FROM candidates c
      JOIN candidate_profiles p ON p.candidate_id = c.candidate_id
      WHERE p.active = 1 AND c.member_name LIKE ? ORDER BY c.member_name COLLATE NOCASE LIMIT 25`)
      .all(`%${query.trim()}%`) as Array<{ name: string; value: string }>;
  }

  private hydrateCandidate(row: Record<string, unknown>): CandidateProfile {
    const songs = this.db.prepare("SELECT song_title FROM candidate_songs WHERE candidate_id = ? ORDER BY priority")
      .all(row.candidate_id) as Array<{ song_title: string }>;
    return {
      candidateId: String(row.candidate_id), memberName: String(row.member_name), groupName: String(row.group_name),
      teamName: String(row.team_name), imageUrl: row.image_url ? String(row.image_url) : undefined,
      sourceUrl: String(row.source_url), active: Number(row.active) === 1, fetchedAt: String(row.fetched_at),
      songs: songs.map(song => song.song_title),
    };
  }
}
