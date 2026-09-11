# BNK48/CGM48 Vote Discord Bot: Project Guide

เอกสารนี้อธิบายภาพรวมระบบ ความสามารถ โครงสร้างโค้ด ฐานข้อมูล และแนวทางพัฒนาต่อสำหรับผู้ดูแลหรือ developer คนถัดไป

## 1. วัตถุประสงค์

โปรเจกต์นี้เป็น Discord bot สำหรับ:

- ค้นประวัติการโหวตจาก wallet/address
- สรุปยอดโหวตแยกตามงานและเมมเบอร์
- ดูรายการโหวตทีละ transaction
- เปิดหรือปิดการแสดงผลแบบส่วนตัวในแต่ละ Discord server
- เก็บรายชื่อผู้สมัคร GE6 และเพลงที่คาดหวัง
- เตรียมรับธุรกรรม GE6 แบบ real-time จาก TokenX
- แจ้งเตือนธุรกรรมขนาดใหญ่ผ่าน Whale Alert
- วิเคราะห์ความน่าจะเป็นของคะแนนและอันดับ GE6 จากข้อมูลย้อนหลัง

## 2. Technology Stack

- TypeScript
- Node.js 24.17.0 ขึ้นไป
- discord.js 14
- SQLite ผ่าน better-sqlite3
- decimal.js สำหรับคำนวณ token แบบทศนิยมโดยไม่เสียความแม่นยำ
- ExcelJS สำหรับนำเข้าข้อมูล Excel/CSV
- Cheerio สำหรับอ่านรายชื่อผู้สมัครจากหน้าเว็บ
- Zod สำหรับตรวจ environment variables
- Node Test Runner สำหรับ automated tests

## 3. สถานะปัจจุบัน

### พร้อมใช้งาน

- Discord bot และการลงทะเบียน Slash Commands อัตโนมัติ
- ค้นและสรุปข้อมูลย้อนหลัง 8 งาน
- ข้อมูลย้อนหลัง 126,346 transactions
- ค้นด้วย wallet/address
- ดู transaction แบบแบ่งหน้า
- ดูยอดตามเมมเบอร์และงาน
- ตั้งค่าความเป็นส่วนตัวแยกตาม Discord server
- ฐานข้อมูล GE6 แยกจากข้อมูลย้อนหลัง
- รายชื่อผู้สมัคร GE6 จำนวน 58 คน
- เพลงที่คาดหวัง 174 รายการ
- Autocomplete สำหรับเลือกชื่อผู้สมัคร GE6
- โครงสร้างข้อมูล prediction และหน้าผลลัพธ์ `/forecast`
- การตั้งค่า ล็อกห้อง และทดสอบ Whale Alert

### รอข้อมูลหรือการเชื่อมต่อภายนอก

- TokenX RPC/WebSocket endpoint
- Chain ID ที่ยืนยันจาก TokenX
- GE6 voting contract address
- Contract ABI หรือ event signature
- Block เริ่มต้นของการโหวต GE6
- Mapping ข้อมูลบน chain กับ candidate ID
- โมเดล prediction ที่ฝึกและประเมินผลแล้ว
- Whale Alert จาก transaction จริง

คำสั่ง `/forecast` จะแจ้งว่าไม่มีผลคาดการณ์จนกว่าจะมี prediction run จริง ระบบจะไม่สร้างเปอร์เซ็นต์สมมติ

## 4. Discord Commands

### `/wallet`

```text
/wallet id:<wallet หรือ address>
```

ความสามารถ:

- ค้นข้อมูลโดยไม่สนตัวพิมพ์เล็กและใหญ่
- สรุปยอดแยกตามงานและเมมเบอร์
- แสดงจำนวน token และจำนวน transactions
- แสดงยอดรวมทุกงาน
- ค่าเริ่มต้นเป็นข้อความส่วนตัวแบบ ephemeral

### `/transactions`

```text
/transactions id:<wallet หรือ address>
/transactions id:<wallet หรือ address> event:GE4 page:2
```

ความสามารถ:

- แสดงจำนวน transactions ทั้งหมดของ address
- แสดงรายการล่าสุดก่อน
- แสดงวันเวลา งาน เมมเบอร์ และจำนวน token
- กรองตามงานได้
- แบ่งหน้าละ 10 รายการ
- ค่าเริ่มต้นเป็นข้อความส่วนตัว

ไฟล์ย้อนหลังไม่มี transaction hash จึงยังไม่สามารถสร้างลิงก์ TokenX Scan สำหรับรายการเก่าได้

### `/member`

```text
/member name:Sita
/member name:Sita event:GE4
```

ความสามารถ:

- ดูยอดรวมของเมมเบอร์
- แสดงผลแยกตามงาน
- กรองเฉพาะงานได้
- ผลลัพธ์แสดงในห้อง Discord

### `/privacy`

```text
/privacy command:wallet visibility:เฉพาะผู้ค้นหา
/privacy command:wallet visibility:ทุกคนในห้อง
/privacy command:transactions visibility:เฉพาะผู้ค้นหา
/privacy command:transactions visibility:ทุกคนในห้อง
```

ความสามารถ:

- กำหนดการมองเห็น `/wallet` และ `/transactions` แยกจากกัน
- บันทึกค่าต่อ Discord server
- ค่าไม่หายเมื่อรีสตาร์ตบอต
- ใช้ได้เฉพาะผู้มีสิทธิ์ Manage Server
- ใน Direct Message จะเป็นส่วนตัวเสมอ

### `/ge6`

```text
/ge6 candidates
/ge6 candidates page:2
/ge6 member name:Arlee
```

ความสามารถ:

- แสดงรายชื่อผู้สมัคร GE6 ทั้งหมดแบบแบ่งหน้า
- แสดงวงและทีม
- เลือกชื่อเมมเบอร์ด้วย autocomplete
- แสดงรูปและเพลงที่คาดหวังลำดับ 1–3
- มีปุ่มเปิดข้อมูลต้นทาง

ข้อมูลมาจาก `https://withmywish.com/ge2026/`

### `/forecast`

```text
/forecast table
/forecast table page:2
/forecast member name:Sita
/forecast member name:Sita rank:13
```

ความสามารถที่เตรียมไว้:

- ตารางอันดับและคะแนนคาดหมายล่าสุด
- แสดงเวลาประมวลผล Block ล่าสุด เวอร์ชันโมเดล และจำนวน simulation
- โอกาสได้อันดับ 1
- โอกาสเป็น Kami7
- โอกาสเป็น Senbatsu
- โอกาสเป็น Under Girls
- โอกาสเป็น Next Girls
- โอกาสไม่ติดอันดับ
- โอกาสได้อันดับ Center ที่ 1, 13 และ 25
- ระบุอันดับอื่นตั้งแต่ 1–58 เพื่อดูความน่าจะเป็นเพิ่มเติมได้

โครงสร้างอันดับ GE6:

| อันดับ | ผลลัพธ์ |
| --- | --- |
| 1–7 | Kami7 และเป็นส่วนหนึ่งของ Senbatsu |
| 8–12 | Senbatsu |
| 13–24 | Under Girls |
| 25–36 | Next Girls |
| 37–58 | ไม่ติดอันดับ |

ผู้สมัครรวม 58 คน

### `/whale`

```text
/whale setup channel:#whale-alert threshold:1000
/whale test member:Sita amount:1000 address:0x1234...
/whale status
/whale disable
```

ความสามารถ:

- เลือก Text Channel สำหรับ Whale Alert
- กำหนด threshold ได้ ค่าเริ่มต้น 1,000 tokens
- ล็อกไม่ให้ `@everyone` ส่งข้อความ เพิ่ม reaction หรือสร้าง thread
- ให้บอต View Channel, Send Messages และ Embed Links
- ทดสอบ alert ได้ก่อนเชื่อม TokenX
- แสดงเมมเบอร์ จำนวน token address แบบย่อ block และลิงก์ transaction
- ใช้ได้เฉพาะผู้มีสิทธิ์ Manage Server และ Manage Channels

Whale Alert จากข้อมูลจริงต้องถูกเรียกหลัง indexer ยืนยัน transaction แล้ว และต้อง deduplicate ด้วย `(tx_hash, log_index)`

## 5. ฐานข้อมูล

ระบบแยกฐานข้อมูลเพื่อไม่ให้ข้อมูล training ปนกับข้อมูลสดหรือค่าตั้ง Discord

### `data/historical-votes.sqlite`

ใช้สำหรับ:

- ข้อมูลโหวตย้อนหลัง 8 งาน
- การค้นหา `/wallet`, `/transactions` และ `/member`
- Training data และ feature engineering

ตัวดึงข้อมูล GE6 ห้ามเขียนลงฐานนี้

ตารางหลัก `votes` มีข้อมูล:

- event
- member
- amount
- wallet/address
- tx_hash ถ้ามี
- voted_at
- source file, sheet และ row

### `data/ge6-analysis.sqlite`

ใช้สำหรับ:

- รายชื่อผู้สมัคร GE6
- เพลงที่คาดหวัง
- candidate mapping บน TokenX
- chain events
- sync checkpoint
- prediction runs
- ranking predictions
- wallet predictions

ตารางสำคัญ:

- `candidates`
- `candidate_profiles`
- `candidate_songs`
- `chain_events`
- `sync_state`
- `prediction_runs`
- `ranking_predictions`
- `wallet_predictions`

### `data/bot-settings.sqlite`

ใช้สำหรับ:

- Privacy settings ต่อ Discord server
- Whale Alert channel
- Whale threshold
- สถานะเปิดหรือปิด Whale Alert

## 6. Data Flow

### ข้อมูลย้อนหลัง

```text
Excel/CSV
  → import-votes.ts
  → historical-votes.sqlite
  → /wallet, /transactions, /member
```

### รายชื่อผู้สมัคร GE6

```text
withmywish.com/ge2026
  → sync-ge6-roster.ts
  → ตรวจว่าครบ 58 คนและคนละ 3 เพลง
  → ge6-analysis.sqlite
  → /ge6 candidates, /ge6 member
```

### TokenX GE6 ในอนาคต

```text
TokenX RPC/WebSocket
  → historical sync ด้วย eth_getLogs
  → real-time block/log listener
  → decode voting event
  → รอ confirmations
  → ge6-analysis.sqlite
  → Whale Alert
  → prediction pipeline
  → /forecast
```

## 7. Prediction Design

ระบบ prediction ควรแบ่งเป็นสองระดับ

### Wallet prediction

คำนวณความน่าจะเป็นที่แต่ละ wallet จะโหวตให้เมมเบอร์แต่ละคน และจำนวน token ที่คาดว่าจะใช้

Feature เริ่มต้น:

- เมมเบอร์ที่เคยโหวต
- สัดส่วน token ต่อเมมเบอร์
- ความถี่ของการโหวต
- ความใหม่ของข้อมูลหรือ recency
- ความต่อเนื่องข้ามงาน
- ขนาด transaction โดยทั่วไป
- งานและวงที่ wallet เคยมีส่วนร่วม
- Hint ที่ผู้ดูแลป้อนเพิ่มเติม
- ธุรกรรมจริงที่เกิดขึ้นใน GE6

### Ranking simulation

นำผล wallet prediction และข้อมูลจริงมาจำลองหลายรอบแบบ Monte Carlo เพื่อคำนวณ:

- Expected tokens
- Expected rank
- P(rank = 1)
- P(Kami7)
- P(Senbatsu)
- P(Under Girls)
- P(Next Girls)
- P(Unranked)
- Probability distribution ของอันดับ 1–58

ทุก prediction run ต้องบันทึก model version, historical cutoff, GE6 block cutoff, จำนวน simulation และเวลาเสมอ

## 8. Environment Variables

ขั้นต่ำ:

```env
DISCORD_TOKEN=
```

ค่าที่เลือกใช้ได้:

```env
DISCORD_GUILD_ID=
HISTORICAL_DATABASE_PATH=./data/historical-votes.sqlite
GE6_DATABASE_PATH=./data/ge6-analysis.sqlite
BOT_SETTINGS_DATABASE_PATH=./data/bot-settings.sqlite
TOKENX_EXPLORER_URL=https://scan.tokenx.finance

TOKENX_RPC_URL=
TOKENX_WS_URL=
TOKENX_CHAIN_ID=
TOKENX_API_KEY=
TOKENX_VOTE_CONTRACT=
TOKENX_START_BLOCK=
TOKENX_CONFIRMATIONS=3
```

ห้าม commit `.env`, Bot Token, API key, private key หรือ seed phrase

การอ่าน blockchain อย่างเดียวไม่ต้องใช้ private key

## 9. คำสั่งสำหรับ Developer

ติดตั้ง dependencies:

```bash
npm install
```

เปิด development mode:

```bash
npm run dev
```

Build และรัน production:

```bash
npm run build
npm start
```

สร้าง schema ฐานข้อมูล:

```bash
npm run db:init
```

รัน automated tests:

```bash
npm test
```

นำเข้าไฟล์โหวตย้อนหลัง:

```bash
npm run import -- "/path/to/file.xlsx"
```

อัปเดตรายชื่อผู้สมัครและเพลง GE6:

```bash
npm run ge6:sync-roster
```

## 10. โครงสร้างไฟล์สำคัญ

```text
src/
  index.ts                 Discord client และ command handlers
  commands.ts              Slash Command definitions
  config.ts                Environment configuration
  db.ts                    Historical vote repository
  ge6-db.ts                GE6 roster, chain และ prediction repository
  bot-settings-db.ts       Discord server settings repository
  import-votes.ts          Excel/CSV importer
  sync-ge6-roster.ts       GE6 roster scraper/importer
  render.ts                Historical vote embeds
  candidate-render.ts      Candidate and song embeds
  forecast-render.ts       Prediction embeds
  whale-alert.ts           Whale Alert rendering and dispatch
  prediction/
    rank-tier.ts           GE6 rank classification

test/                      Automated tests
data/                      SQLite databases; ignored by Git
docs/PROJECT_GUIDE.md      เอกสารนี้
README.md                  คู่มือติดตั้งและใช้งาน
```

## 11. สิทธิ์ของ Discord Bot

Scopes ตอนเชิญบอต:

- `bot`
- `applications.commands`

Permissions:

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Channels สำหรับตั้งและล็อกห้อง Whale Alert

ไม่ควรให้ Administrator ถ้าไม่จำเป็น

## 12. Safety and Data Integrity

- ใช้ Decimal แทน JavaScript floating-point สำหรับยอด token
- Normalize address เป็นตัวพิมพ์เล็กก่อนค้นหา
- ใช้ source file, sheet และ row ป้องกันข้อมูลนำเข้าซ้ำ
- ใช้ tx hash และ log index ป้องกัน chain event ซ้ำ
- เก็บ checkpoint เพื่อดึงข้อมูลที่ตกหล่นหลัง WebSocket หลุด
- รอ confirmations ก่อนส่ง Whale Alert หรือใช้ข้อมูลเป็นผลยืนยัน
- เก็บ historical data แยกจาก GE6 และ bot settings
- การ sync roster จะไม่บันทึกถ้าไม่ครบ 58 คนหรือเพลงไม่ครบคนละ 3 เพลง
- ไม่สร้าง prediction ถ้าไม่มี model output จริง

## 13. งานที่ควรทำต่อ

1. รับ TokenX RPC/WebSocket access และข้อมูล contract
2. เพิ่ม chain indexer พร้อม reconnect, backfill และ reorg handling
3. เพิ่ม candidate mapping จาก on-chain ID/address
4. เชื่อม confirmed vote event กับ Whale Alert
5. เพิ่มระบบป้อนและจัดการ wallet hints พร้อม provenance/confidence
6. สร้าง baseline prediction และ time-based evaluation
7. เพิ่ม Monte Carlo ranking simulation
8. เพิ่ม scheduler สำหรับ prediction run ตามช่วงเวลา
9. เพิ่ม monitoring, structured logs และ alert เมื่อ indexer หยุด
10. เพิ่ม backup และ retention policy สำหรับ SQLite

## 14. ข้อจำกัดสำคัญ

- เว็บไซต์รายชื่อผู้สมัครเป็นแหล่งข้อมูลภายนอกและอาจเปลี่ยนโครงสร้างได้
- ข้อมูล Excel เก่าไม่มี transaction hash
- ยังไม่ทราบ TokenX contract และ event schema ของ GE6
- ค่า probability จะน่าเชื่อถือได้ต่อเมื่อมีการประเมินโมเดลย้อนหลังและ calibration
- Whale Alert real-time ยังไม่ทำงานจนกว่าจะเชื่อม TokenX indexer
