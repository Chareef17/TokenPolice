import ExcelJS from "exceljs";
import { Decimal } from "decimal.js";
import { extname, basename, resolve } from "node:path";
import { historicalDatabasePath } from "./config.js";
import { VoteRepository } from "./db.js";
import { canonicalAmount, type VoteInput } from "./domain.js";

const eventNames: Record<string, string> = {
  "BNK48 12th Single Senbatsu General Election.xlsx": "GE3",
  "BNK48 16th Single Senbatsu General Election.xlsx": "GE4",
  "มหาเทวีนางสงกรานต์๔๘ 2024.xlsx": "Songkran 2024",
  "Total Token Poll 365-Nichi no Kamihikouki Senbatsu (2024 Version).xlsx": "365-Nichi 2024",
  "Battle Vote of 2024 Request Hour.xlsx": "Request Hour 2024",
  "BNK48 & CGM48 Senbatsu General Election 2025.xlsx": "GE5",
  "2025 Thai-Chinese Cultural Ambassador.xlsx": "Thai-Chinese 2025",
  "2026 Thai - Japan Collaboration Project.xlsx": "Thai-Japan 2026",
};

const inputFiles = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
if (!inputFiles.length) throw new Error("วิธีใช้: npm run import -- <ไฟล์.xlsx|csv> [ไฟล์อื่น ...]");
const repo = new VoteRepository(historicalDatabasePath);

const cellText = (cell: ExcelJS.Cell): string => cell.text.trim();

function dateText(cell: ExcelJS.Cell): string | undefined {
  if (cell.value instanceof Date) return cell.value.toISOString();
  return cellText(cell) || undefined;
}

function findColumn(headers: string[], candidates: string[]): number {
  const found = headers.findIndex(h => candidates.includes(h));
  return found < 0 ? 0 : found + 1;
}

function parseTransactionSheet(sheet: ExcelJS.Worksheet, event: string): VoteInput[] {
  const headerRow = sheet.getRow(1);
  const headers = Array.from({ length: headerRow.cellCount }, (_, i) => cellText(headerRow.getCell(i + 1)).toLowerCase());
  const dateCol = findColumn(headers, ["date", "datetime", "timestamp", "เวลา", "voted_at"]);
  const memberCol = findColumn(headers, ["name", "member", "candidate", "เมมเบอร์"]);
  const walletCol = findColumn(headers, ["wallet", "address", "wallet_address", "ที่อยู่"]);
  const amountCol = findColumn(headers, ["score divide", "amount", "tokens", "จำนวน", "vote", "votes"])
    || headers.findIndex(h => h === "score") + 1;
  if (!memberCol || !walletCol || !amountCol) throw new Error(`${sheet.name}: ไม่พบคอลัมน์ Name, Score และ Wallet`);

  const votes: VoteInput[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const member = cellText(row.getCell(memberCol));
    const address = cellText(row.getCell(walletCol));
    const amountText = cellText(row.getCell(amountCol)).replaceAll(",", "");
    if (!member && !address && !amountText) return;
    if (!member || !address || !amountText) throw new Error(`${sheet.name} แถว ${rowNumber}: ข้อมูลไม่ครบ`);
    votes.push({ event, member, address, amount: canonicalAmount(new Decimal(amountText)),
      votedAt: dateCol ? dateText(row.getCell(dateCol)) : undefined });
  });
  return votes;
}

let grandRows = 0;
let grandTotal = new Decimal(0);
for (const input of inputFiles) {
  const file = resolve(input);
  const book = new ExcelJS.Workbook();
  let sheets: ExcelJS.Worksheet[];
  if (extname(file).toLowerCase() === ".csv") sheets = [await book.csv.readFile(file)];
  else {
    await book.xlsx.readFile(file);
    sheets = book.worksheets;
  }
  const transaction = sheets.find(s => s.name.trim().toLowerCase() === "transaction") ?? sheets[0];
  if (!transaction) throw new Error(`${file}: ไม่พบ sheet ข้อมูล`);
  const event = eventNames[basename(file)] ?? basename(file, extname(file));
  const votes = parseTransactionSheet(transaction, event);
  repo.insertMany(votes, file, transaction.name);
  const total = votes.reduce((sum, vote) => sum.plus(vote.amount), new Decimal(0));
  grandRows += votes.length;
  grandTotal = grandTotal.plus(total);
  console.log(`${event}: ${votes.length.toLocaleString()} transactions, ${canonicalAmount(total)} tokens`);
}
console.log(`รวม ${grandRows.toLocaleString()} transactions, ${canonicalAmount(grandTotal)} tokens`);
