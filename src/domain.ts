import { Decimal } from "decimal.js";

export type VoteInput = {
  event: string;
  member: string;
  amount: string;
  wallet?: string;
  address?: string;
  txHash?: string;
  votedAt?: string;
};

export const normalizeIdentifier = (value: string) => value.trim().toLowerCase();

export function canonicalAmount(value: Decimal.Value): string {
  const amount = new Decimal(value);
  if (!amount.isFinite() || amount.isNegative()) throw new Error(`Invalid token amount: ${value}`);
  return amount.toFixed().replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function formatTokens(value: Decimal.Value): string {
  const text = canonicalAmount(value);
  const [integer = "0", fraction] = text.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function groupVotes(rows: Array<{ event: string; member: string; amount: string }>) {
  const events = new Map<string, Map<string, Decimal>>();
  for (const row of rows) {
    const members = events.get(row.event) ?? new Map<string, Decimal>();
    members.set(row.member, (members.get(row.member) ?? new Decimal(0)).plus(row.amount));
    events.set(row.event, members);
  }
  return events;
}
