import { load } from "cheerio";
import { ge6DatabasePath } from "./config.js";
import { Ge6Repository, type CandidateInput } from "./ge6-db.js";

const SOURCE_URL = "https://withmywish.com/ge2026/";
const response = await fetch(SOURCE_URL, { headers: { "user-agent": "BNK48-CGM48-Vote-Bot/0.1" } });
if (!response.ok) throw new Error(`โหลด ${SOURCE_URL} ไม่สำเร็จ: HTTP ${response.status}`);
const $ = load(await response.text());
const candidates = new Map<string, CandidateInput>();

$(".item-candidate[data-member]").each((_, element) => {
  const item = $(element);
  const candidateId = item.attr("data-member")?.trim();
  const songs = item.find("ol.songs li").map((__, song) => $(song).text().trim()).get().filter(Boolean);
  if (!candidateId || !songs.length || candidates.has(candidateId)) return;
  const paragraphs = item.find("p");
  const memberName = item.find(".candidate-name").first().text().trim();
  const teamName = paragraphs.eq(1).text().trim();
  const groupName = item.attr("data-band")?.trim() || teamName.split(" ")[0] || "Unknown";
  const imageUrl = item.find("img").first().attr("src")?.trim();
  if (!memberName || !teamName) throw new Error(`ข้อมูลผู้สมัคร ${candidateId} ไม่ครบ`);
  candidates.set(candidateId, { candidateId, memberName, groupName, teamName, imageUrl, sourceUrl: SOURCE_URL, songs });
});

if (candidates.size !== 58) throw new Error(`คาดว่าจะพบผู้สมัคร 58 คน แต่พบ ${candidates.size} คน จึงยกเลิกการบันทึก`);
if ([...candidates.values()].some(candidate => candidate.songs.length !== 3)) {
  throw new Error("ผู้สมัครบางคนมีเพลงไม่ครบ 3 เพลง จึงยกเลิกการบันทึก");
}

new Ge6Repository(ge6DatabasePath).replaceCandidateRoster([...candidates.values()]);
const bnk = [...candidates.values()].filter(candidate => candidate.groupName === "BNK48").length;
const cgm = [...candidates.values()].filter(candidate => candidate.groupName === "CGM48").length;
console.log(`บันทึกผู้สมัคร ${candidates.size} คน (BNK48 ${bnk}, CGM48 ${cgm}) และเพลง ${candidates.size * 3} รายการ`);
